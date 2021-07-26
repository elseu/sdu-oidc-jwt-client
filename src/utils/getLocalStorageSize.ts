function getLocalStorageSize() {
  let total = 0;
  for (const x in localStorage) {
    // Value is multiplied by 2 due to data being stored in `utf-16` format, which requires twice the space.
    const amount = (localStorage[x].length * 2) / 1024 / 1024;
    if (!isNaN(amount) && localStorage[x]) {
      total += amount;
    }
  }
  return total.toFixed(2);
}

export { getLocalStorageSize };
