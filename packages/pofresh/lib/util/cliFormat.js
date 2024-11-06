const {table, getBorderCharacters} = require('table');
const chalk = require('chalk');

const config = {
    border: getBorderCharacters('void'),
    drawHorizontalLine: () => false
};

const exp = module.exports;

/**
 * Outputs the specified `rows` as fixed-width columns, adding
 *
 * @rows {Array} Matrix of properties to output in row major form
 * @colors {Array} Set of colors to use for the headers
 * @return {String}
 */
exp.stringifyRows = function (rows, colors = []) {
    if (!rows || !rows.length || !rows[0].length) {
        return '';
    }
    rows[0].forEach((header, index) => {
        rows[0][index] = colors[index] ? chalk[colors[index]](header) : header;
    });
    return table(rows, config);
};
