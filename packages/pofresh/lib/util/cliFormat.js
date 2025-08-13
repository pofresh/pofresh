const chalk = require('chalk');
const { getBorderCharacters, table } = require('table');

const config = {
    border: getBorderCharacters('void'),
    drawHorizontalLine: () => false
};

/**
 * Outputs the specified `rows` as fixed-width columns, adding colors to headers
 * @param {Array} rows - Matrix of properties to output in row major form
 * @param {Array} colors - Set of colors to use for the headers
 * @returns {string} Formatted table string
 */
function stringifyRows(rows = [], colors = []) {
    if (!(rows?.length && rows[0]?.length)) {
        return '';
    }

    const headerRow = rows[0].map((header, index) => (colors[index] ? chalk[colors[index]](header) : header));

    const formattedRows = [headerRow, ...rows.slice(1)];

    return table(formattedRows, config);
}

module.exports = {
    stringifyRows
};
