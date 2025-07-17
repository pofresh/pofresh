/**
 * convert Date as  yyyy-mm-dd hh:mm:ss
 */
function formatTime(date) {
  const n = date.getFullYear();
  const y = date.getMonth() + 1;
  const r = date.getDate();
  const mytime = date.toLocaleTimeString();
  const mytimes = n + '-' + y + '-' + r + ' ' + mytime;
  return mytimes;
}

module.exports.formatTime = formatTime;
