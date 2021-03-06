/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require", "exports", "vs/base/common/strings", "vs/editor/common/controller/cursorCommon", "vs/editor/common/controller/wordCharacterClassifier", "vs/editor/common/core/position", "vs/editor/common/core/range"], function (require, exports, strings, cursorCommon_1, wordCharacterClassifier_1, position_1, range_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WordPartOperations = exports.WordOperations = exports.WordNavigationType = void 0;
    var WordType;
    (function (WordType) {
        WordType[WordType["None"] = 0] = "None";
        WordType[WordType["Regular"] = 1] = "Regular";
        WordType[WordType["Separator"] = 2] = "Separator";
    })(WordType || (WordType = {}));
    var WordNavigationType;
    (function (WordNavigationType) {
        WordNavigationType[WordNavigationType["WordStart"] = 0] = "WordStart";
        WordNavigationType[WordNavigationType["WordStartFast"] = 1] = "WordStartFast";
        WordNavigationType[WordNavigationType["WordEnd"] = 2] = "WordEnd";
        WordNavigationType[WordNavigationType["WordAccessibility"] = 3] = "WordAccessibility"; // Respect chrome defintion of a word
    })(WordNavigationType = exports.WordNavigationType || (exports.WordNavigationType = {}));
    class WordOperations {
        static _createWord(lineContent, wordType, nextCharClass, start, end) {
            // console.log('WORD ==> ' + start + ' => ' + end + ':::: <<<' + lineContent.substring(start, end) + '>>>');
            return { start: start, end: end, wordType: wordType, nextCharClass: nextCharClass };
        }
        static _findPreviousWordOnLine(wordSeparators, model, position) {
            let lineContent = model.getLineContent(position.lineNumber);
            return this._doFindPreviousWordOnLine(lineContent, wordSeparators, position);
        }
        static _doFindPreviousWordOnLine(lineContent, wordSeparators, position) {
            let wordType = 0 /* None */;
            for (let chIndex = position.column - 2; chIndex >= 0; chIndex--) {
                let chCode = lineContent.charCodeAt(chIndex);
                let chClass = wordSeparators.get(chCode);
                if (chClass === 0 /* Regular */) {
                    if (wordType === 2 /* Separator */) {
                        return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                    }
                    wordType = 1 /* Regular */;
                }
                else if (chClass === 2 /* WordSeparator */) {
                    if (wordType === 1 /* Regular */) {
                        return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                    }
                    wordType = 2 /* Separator */;
                }
                else if (chClass === 1 /* Whitespace */) {
                    if (wordType !== 0 /* None */) {
                        return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                    }
                }
            }
            if (wordType !== 0 /* None */) {
                return this._createWord(lineContent, wordType, 1 /* Whitespace */, 0, this._findEndOfWord(lineContent, wordSeparators, wordType, 0));
            }
            return null;
        }
        static _findEndOfWord(lineContent, wordSeparators, wordType, startIndex) {
            let len = lineContent.length;
            for (let chIndex = startIndex; chIndex < len; chIndex++) {
                let chCode = lineContent.charCodeAt(chIndex);
                let chClass = wordSeparators.get(chCode);
                if (chClass === 1 /* Whitespace */) {
                    return chIndex;
                }
                if (wordType === 1 /* Regular */ && chClass === 2 /* WordSeparator */) {
                    return chIndex;
                }
                if (wordType === 2 /* Separator */ && chClass === 0 /* Regular */) {
                    return chIndex;
                }
            }
            return len;
        }
        static _findNextWordOnLine(wordSeparators, model, position) {
            let lineContent = model.getLineContent(position.lineNumber);
            return this._doFindNextWordOnLine(lineContent, wordSeparators, position);
        }
        static _doFindNextWordOnLine(lineContent, wordSeparators, position) {
            let wordType = 0 /* None */;
            let len = lineContent.length;
            for (let chIndex = position.column - 1; chIndex < len; chIndex++) {
                let chCode = lineContent.charCodeAt(chIndex);
                let chClass = wordSeparators.get(chCode);
                if (chClass === 0 /* Regular */) {
                    if (wordType === 2 /* Separator */) {
                        return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                    }
                    wordType = 1 /* Regular */;
                }
                else if (chClass === 2 /* WordSeparator */) {
                    if (wordType === 1 /* Regular */) {
                        return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                    }
                    wordType = 2 /* Separator */;
                }
                else if (chClass === 1 /* Whitespace */) {
                    if (wordType !== 0 /* None */) {
                        return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                    }
                }
            }
            if (wordType !== 0 /* None */) {
                return this._createWord(lineContent, wordType, 1 /* Whitespace */, this._findStartOfWord(lineContent, wordSeparators, wordType, len - 1), len);
            }
            return null;
        }
        static _findStartOfWord(lineContent, wordSeparators, wordType, startIndex) {
            for (let chIndex = startIndex; chIndex >= 0; chIndex--) {
                let chCode = lineContent.charCodeAt(chIndex);
                let chClass = wordSeparators.get(chCode);
                if (chClass === 1 /* Whitespace */) {
                    return chIndex + 1;
                }
                if (wordType === 1 /* Regular */ && chClass === 2 /* WordSeparator */) {
                    return chIndex + 1;
                }
                if (wordType === 2 /* Separator */ && chClass === 0 /* Regular */) {
                    return chIndex + 1;
                }
            }
            return 0;
        }
        static moveWordLeft(wordSeparators, model, position, wordNavigationType) {
            let lineNumber = position.lineNumber;
            let column = position.column;
            let movedToPreviousLine = false;
            if (column === 1) {
                if (lineNumber > 1) {
                    movedToPreviousLine = true;
                    lineNumber = lineNumber - 1;
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
            let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, column));
            if (wordNavigationType === 0 /* WordStart */) {
                if (prevWordOnLine && !movedToPreviousLine) {
                    // Special case for Visual Studio compatibility:
                    // when starting in the trim whitespace at the end of a line,
                    // go to the end of the last word
                    const lastWhitespaceColumn = model.getLineLastNonWhitespaceColumn(lineNumber);
                    if (lastWhitespaceColumn < column) {
                        return new position_1.Position(lineNumber, prevWordOnLine.end + 1);
                    }
                }
                return new position_1.Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
            }
            if (wordNavigationType === 1 /* WordStartFast */) {
                if (prevWordOnLine
                    && prevWordOnLine.wordType === 2 /* Separator */
                    && prevWordOnLine.end - prevWordOnLine.start === 1
                    && prevWordOnLine.nextCharClass === 0 /* Regular */) {
                    // Skip over a word made up of one single separator and followed by a regular character
                    prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, prevWordOnLine.start + 1));
                }
                return new position_1.Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
            }
            if (wordNavigationType === 3 /* WordAccessibility */) {
                while (prevWordOnLine
                    && prevWordOnLine.wordType === 2 /* Separator */) {
                    // Skip over words made up of only separators
                    prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, prevWordOnLine.start + 1));
                }
                return new position_1.Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
            }
            // We are stopping at the ending of words
            if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, prevWordOnLine.start + 1));
            }
            return new position_1.Position(lineNumber, prevWordOnLine ? prevWordOnLine.end + 1 : 1);
        }
        static _moveWordPartLeft(model, position) {
            const lineNumber = position.lineNumber;
            const maxColumn = model.getLineMaxColumn(lineNumber);
            if (position.column === 1) {
                return (lineNumber > 1 ? new position_1.Position(lineNumber - 1, model.getLineMaxColumn(lineNumber - 1)) : position);
            }
            const lineContent = model.getLineContent(lineNumber);
            for (let column = position.column - 1; column > 1; column--) {
                const left = lineContent.charCodeAt(column - 2);
                const right = lineContent.charCodeAt(column - 1);
                if (left === 95 /* Underline */ && right !== 95 /* Underline */) {
                    // snake_case_variables
                    return new position_1.Position(lineNumber, column);
                }
                if (strings.isLowerAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                    // camelCaseVariables
                    return new position_1.Position(lineNumber, column);
                }
                if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                    // thisIsACamelCaseWithOneLetterWords
                    if (column + 1 < maxColumn) {
                        const rightRight = lineContent.charCodeAt(column);
                        if (strings.isLowerAsciiLetter(rightRight)) {
                            return new position_1.Position(lineNumber, column);
                        }
                    }
                }
            }
            return new position_1.Position(lineNumber, 1);
        }
        static moveWordRight(wordSeparators, model, position, wordNavigationType) {
            let lineNumber = position.lineNumber;
            let column = position.column;
            let movedDown = false;
            if (column === model.getLineMaxColumn(lineNumber)) {
                if (lineNumber < model.getLineCount()) {
                    movedDown = true;
                    lineNumber = lineNumber + 1;
                    column = 1;
                }
            }
            let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, column));
            if (wordNavigationType === 2 /* WordEnd */) {
                if (nextWordOnLine && nextWordOnLine.wordType === 2 /* Separator */) {
                    if (nextWordOnLine.end - nextWordOnLine.start === 1 && nextWordOnLine.nextCharClass === 0 /* Regular */) {
                        // Skip over a word made up of one single separator and followed by a regular character
                        nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, nextWordOnLine.end + 1));
                    }
                }
                if (nextWordOnLine) {
                    column = nextWordOnLine.end + 1;
                }
                else {
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
            else if (wordNavigationType === 3 /* WordAccessibility */) {
                if (movedDown) {
                    // If we move to the next line, pretend that the cursor is right before the first character.
                    // This is needed when the first word starts right at the first character - and in order not to miss it,
                    // we need to start before.
                    column = 0;
                }
                while (nextWordOnLine
                    && (nextWordOnLine.wordType === 2 /* Separator */
                        || nextWordOnLine.start + 1 <= column)) {
                    // Skip over a word made up of one single separator
                    // Also skip over word if it begins before current cursor position to ascertain we're moving forward at least 1 character.
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, nextWordOnLine.end + 1));
                }
                if (nextWordOnLine) {
                    column = nextWordOnLine.start + 1;
                }
                else {
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
            else {
                if (nextWordOnLine && !movedDown && column >= nextWordOnLine.start + 1) {
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, nextWordOnLine.end + 1));
                }
                if (nextWordOnLine) {
                    column = nextWordOnLine.start + 1;
                }
                else {
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
            return new position_1.Position(lineNumber, column);
        }
        static _moveWordPartRight(model, position) {
            const lineNumber = position.lineNumber;
            const maxColumn = model.getLineMaxColumn(lineNumber);
            if (position.column === maxColumn) {
                return (lineNumber < model.getLineCount() ? new position_1.Position(lineNumber + 1, 1) : position);
            }
            const lineContent = model.getLineContent(lineNumber);
            for (let column = position.column + 1; column < maxColumn; column++) {
                const left = lineContent.charCodeAt(column - 2);
                const right = lineContent.charCodeAt(column - 1);
                if (left !== 95 /* Underline */ && right === 95 /* Underline */) {
                    // snake_case_variables
                    return new position_1.Position(lineNumber, column);
                }
                if (strings.isLowerAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                    // camelCaseVariables
                    return new position_1.Position(lineNumber, column);
                }
                if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                    // thisIsACamelCaseWithOneLetterWords
                    if (column + 1 < maxColumn) {
                        const rightRight = lineContent.charCodeAt(column);
                        if (strings.isLowerAsciiLetter(rightRight)) {
                            return new position_1.Position(lineNumber, column);
                        }
                    }
                }
            }
            return new position_1.Position(lineNumber, maxColumn);
        }
        static _deleteWordLeftWhitespace(model, position) {
            const lineContent = model.getLineContent(position.lineNumber);
            const startIndex = position.column - 2;
            const lastNonWhitespace = strings.lastNonWhitespaceIndex(lineContent, startIndex);
            if (lastNonWhitespace + 1 < startIndex) {
                return new range_1.Range(position.lineNumber, lastNonWhitespace + 2, position.lineNumber, position.column);
            }
            return null;
        }
        static deleteWordLeft(wordSeparators, model, selection, whitespaceHeuristics, wordNavigationType) {
            if (!selection.isEmpty()) {
                return selection;
            }
            const position = new position_1.Position(selection.positionLineNumber, selection.positionColumn);
            let lineNumber = position.lineNumber;
            let column = position.column;
            if (lineNumber === 1 && column === 1) {
                // Ignore deleting at beginning of file
                return null;
            }
            if (whitespaceHeuristics) {
                let r = this._deleteWordLeftWhitespace(model, position);
                if (r) {
                    return r;
                }
            }
            let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
            if (wordNavigationType === 0 /* WordStart */) {
                if (prevWordOnLine) {
                    column = prevWordOnLine.start + 1;
                }
                else {
                    if (column > 1) {
                        column = 1;
                    }
                    else {
                        lineNumber--;
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
            else {
                if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
                    prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, prevWordOnLine.start + 1));
                }
                if (prevWordOnLine) {
                    column = prevWordOnLine.end + 1;
                }
                else {
                    if (column > 1) {
                        column = 1;
                    }
                    else {
                        lineNumber--;
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
            return new range_1.Range(lineNumber, column, position.lineNumber, position.column);
        }
        static _deleteWordPartLeft(model, selection) {
            if (!selection.isEmpty()) {
                return selection;
            }
            const pos = selection.getPosition();
            const toPosition = WordOperations._moveWordPartLeft(model, pos);
            return new range_1.Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
        }
        static _findFirstNonWhitespaceChar(str, startIndex) {
            let len = str.length;
            for (let chIndex = startIndex; chIndex < len; chIndex++) {
                let ch = str.charAt(chIndex);
                if (ch !== ' ' && ch !== '\t') {
                    return chIndex;
                }
            }
            return len;
        }
        static _deleteWordRightWhitespace(model, position) {
            const lineContent = model.getLineContent(position.lineNumber);
            const startIndex = position.column - 1;
            const firstNonWhitespace = this._findFirstNonWhitespaceChar(lineContent, startIndex);
            if (startIndex + 1 < firstNonWhitespace) {
                // bingo
                return new range_1.Range(position.lineNumber, position.column, position.lineNumber, firstNonWhitespace + 1);
            }
            return null;
        }
        static deleteWordRight(wordSeparators, model, selection, whitespaceHeuristics, wordNavigationType) {
            if (!selection.isEmpty()) {
                return selection;
            }
            const position = new position_1.Position(selection.positionLineNumber, selection.positionColumn);
            let lineNumber = position.lineNumber;
            let column = position.column;
            const lineCount = model.getLineCount();
            const maxColumn = model.getLineMaxColumn(lineNumber);
            if (lineNumber === lineCount && column === maxColumn) {
                // Ignore deleting at end of file
                return null;
            }
            if (whitespaceHeuristics) {
                let r = this._deleteWordRightWhitespace(model, position);
                if (r) {
                    return r;
                }
            }
            let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);
            if (wordNavigationType === 2 /* WordEnd */) {
                if (nextWordOnLine) {
                    column = nextWordOnLine.end + 1;
                }
                else {
                    if (column < maxColumn || lineNumber === lineCount) {
                        column = maxColumn;
                    }
                    else {
                        lineNumber++;
                        nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, 1));
                        if (nextWordOnLine) {
                            column = nextWordOnLine.start + 1;
                        }
                        else {
                            column = model.getLineMaxColumn(lineNumber);
                        }
                    }
                }
            }
            else {
                if (nextWordOnLine && column >= nextWordOnLine.start + 1) {
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, nextWordOnLine.end + 1));
                }
                if (nextWordOnLine) {
                    column = nextWordOnLine.start + 1;
                }
                else {
                    if (column < maxColumn || lineNumber === lineCount) {
                        column = maxColumn;
                    }
                    else {
                        lineNumber++;
                        nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new position_1.Position(lineNumber, 1));
                        if (nextWordOnLine) {
                            column = nextWordOnLine.start + 1;
                        }
                        else {
                            column = model.getLineMaxColumn(lineNumber);
                        }
                    }
                }
            }
            return new range_1.Range(lineNumber, column, position.lineNumber, position.column);
        }
        static _deleteWordPartRight(model, selection) {
            if (!selection.isEmpty()) {
                return selection;
            }
            const pos = selection.getPosition();
            const toPosition = WordOperations._moveWordPartRight(model, pos);
            return new range_1.Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
        }
        static _createWordAtPosition(model, lineNumber, word) {
            const range = new range_1.Range(lineNumber, word.start + 1, lineNumber, word.end + 1);
            return {
                word: model.getValueInRange(range),
                startColumn: range.startColumn,
                endColumn: range.endColumn
            };
        }
        static getWordAtPosition(model, _wordSeparators, position) {
            const wordSeparators = wordCharacterClassifier_1.getMapForWordSeparators(_wordSeparators);
            const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
            if (prevWord && prevWord.wordType === 1 /* Regular */ && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
                return WordOperations._createWordAtPosition(model, position.lineNumber, prevWord);
            }
            const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
            if (nextWord && nextWord.wordType === 1 /* Regular */ && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
                return WordOperations._createWordAtPosition(model, position.lineNumber, nextWord);
            }
            return null;
        }
        static word(config, model, cursor, inSelectionMode, position) {
            const wordSeparators = wordCharacterClassifier_1.getMapForWordSeparators(config.wordSeparators);
            let prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
            let nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
            if (!inSelectionMode) {
                // Entering word selection for the first time
                let startColumn;
                let endColumn;
                if (prevWord && prevWord.wordType === 1 /* Regular */ && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
                    // isTouchingPrevWord
                    startColumn = prevWord.start + 1;
                    endColumn = prevWord.end + 1;
                }
                else if (nextWord && nextWord.wordType === 1 /* Regular */ && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
                    // isTouchingNextWord
                    startColumn = nextWord.start + 1;
                    endColumn = nextWord.end + 1;
                }
                else {
                    if (prevWord) {
                        startColumn = prevWord.end + 1;
                    }
                    else {
                        startColumn = 1;
                    }
                    if (nextWord) {
                        endColumn = nextWord.start + 1;
                    }
                    else {
                        endColumn = model.getLineMaxColumn(position.lineNumber);
                    }
                }
                return new cursorCommon_1.SingleCursorState(new range_1.Range(position.lineNumber, startColumn, position.lineNumber, endColumn), 0, new position_1.Position(position.lineNumber, endColumn), 0);
            }
            let startColumn;
            let endColumn;
            if (prevWord && prevWord.wordType === 1 /* Regular */ && prevWord.start < position.column - 1 && position.column - 1 < prevWord.end) {
                // isInsidePrevWord
                startColumn = prevWord.start + 1;
                endColumn = prevWord.end + 1;
            }
            else if (nextWord && nextWord.wordType === 1 /* Regular */ && nextWord.start < position.column - 1 && position.column - 1 < nextWord.end) {
                // isInsideNextWord
                startColumn = nextWord.start + 1;
                endColumn = nextWord.end + 1;
            }
            else {
                startColumn = position.column;
                endColumn = position.column;
            }
            let lineNumber = position.lineNumber;
            let column;
            if (cursor.selectionStart.containsPosition(position)) {
                column = cursor.selectionStart.endColumn;
            }
            else if (position.isBeforeOrEqual(cursor.selectionStart.getStartPosition())) {
                column = startColumn;
                let possiblePosition = new position_1.Position(lineNumber, column);
                if (cursor.selectionStart.containsPosition(possiblePosition)) {
                    column = cursor.selectionStart.endColumn;
                }
            }
            else {
                column = endColumn;
                let possiblePosition = new position_1.Position(lineNumber, column);
                if (cursor.selectionStart.containsPosition(possiblePosition)) {
                    column = cursor.selectionStart.startColumn;
                }
            }
            return cursor.move(true, lineNumber, column, 0);
        }
    }
    exports.WordOperations = WordOperations;
    class WordPartOperations extends WordOperations {
        static deleteWordPartLeft(wordSeparators, model, selection, whitespaceHeuristics) {
            const candidates = enforceDefined([
                WordOperations.deleteWordLeft(wordSeparators, model, selection, whitespaceHeuristics, 0 /* WordStart */),
                WordOperations.deleteWordLeft(wordSeparators, model, selection, whitespaceHeuristics, 2 /* WordEnd */),
                WordOperations._deleteWordPartLeft(model, selection)
            ]);
            candidates.sort(range_1.Range.compareRangesUsingEnds);
            return candidates[2];
        }
        static deleteWordPartRight(wordSeparators, model, selection, whitespaceHeuristics) {
            const candidates = enforceDefined([
                WordOperations.deleteWordRight(wordSeparators, model, selection, whitespaceHeuristics, 0 /* WordStart */),
                WordOperations.deleteWordRight(wordSeparators, model, selection, whitespaceHeuristics, 2 /* WordEnd */),
                WordOperations._deleteWordPartRight(model, selection)
            ]);
            candidates.sort(range_1.Range.compareRangesUsingStarts);
            return candidates[0];
        }
        static moveWordPartLeft(wordSeparators, model, position) {
            const candidates = enforceDefined([
                WordOperations.moveWordLeft(wordSeparators, model, position, 0 /* WordStart */),
                WordOperations.moveWordLeft(wordSeparators, model, position, 2 /* WordEnd */),
                WordOperations._moveWordPartLeft(model, position)
            ]);
            candidates.sort(position_1.Position.compare);
            return candidates[2];
        }
        static moveWordPartRight(wordSeparators, model, position) {
            const candidates = enforceDefined([
                WordOperations.moveWordRight(wordSeparators, model, position, 0 /* WordStart */),
                WordOperations.moveWordRight(wordSeparators, model, position, 2 /* WordEnd */),
                WordOperations._moveWordPartRight(model, position)
            ]);
            candidates.sort(position_1.Position.compare);
            return candidates[0];
        }
    }
    exports.WordPartOperations = WordPartOperations;
    function enforceDefined(arr) {
        return arr.filter(el => Boolean(el));
    }
});
//# __sourceMappingURL=cursorWordOperations.js.map