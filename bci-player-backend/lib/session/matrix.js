const { createArray, getRowIndexes, getColIndexes } = require('../util');

const _alphabet = 'BFSDUC'; // B=Backwards, F=Forwards, S=Subtitles, D=Volume Down, U=Volume Up, C=Close
                            // TODO: move to constants or set via UI
const _shuffledIndexes = [            
    [1, 2, 5, 0, 3, 4],  
    [1, 4, 5, 2, 0, 3],
    [4, 0, 2, 3, 5, 1],
    [0, 4, 3, 5, 1, 2],
    [2, 3, 4, 5, 0, 1],
    [4, 5, 0, 1, 3, 2],
    [4, 3, 1, 5, 2, 0],
    [5, 0, 3, 4, 2, 1],
    [2, 0, 5, 3, 1, 4],
    [3, 1, 4, 2, 0, 5],
];

class Cell {
    constructor(symbol = '?') {
        this.defaultColor = Cell.Colors.RED;
        this.color = '';
        this.symbol = symbol;
    }

    highlight(color = this.defaultColor) {
        this.color = color;
    }

    dim() {
        this.color = '';
    }

    get highlighted() {
        return !!this.color;
    }
}

Cell.ColorsList = Object.keys(Cell.Colors).map(key => Cell.Colors[key]);

class Matrix {
    constructor(rows = 2, cols = 3, alphabet = _alphabet, shuffledIndexes = _shuffledIndexes[2]) {
        this.defaultColor = Cell.Colors.RED;

        this.rows = rows;
        this.cols = cols;
        this.alphabet = alphabet;
        this.shuffledIndexes = shuffledIndexes;

        this.cells = createArray(this.size)
            .map((cell, i) => new Cell(alphabet[i]));

        this.rowIndexes = getRowIndexes(this.rows, this.cols);
        this.colIndexes = getColIndexes(this.rows, this.cols);
    }

    get size() {
        return this.rows * this.cols;
    }

    getIndexFromCoord(row, col) {
        return (row * this.rows) + col;
    }

    getCellAt(row, col) {
        return this.cells[this.getIndexFromCoord(row, col)];
    }
}

module.exports.Cell = Cell;
module.exports.Matrix = Matrix;
