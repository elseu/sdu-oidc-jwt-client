function isQuotaExceeded(e: any) {
  let isQuotaExceeded = false;
  if (e?.code) {
    switch (e.code) {
      case 22:
        isQuotaExceeded = true;
        break;
      case 1014:
        // Firefox
        if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          isQuotaExceeded = true;
        }
        break;
    }
  }
  return isQuotaExceeded;
}

export { isQuotaExceeded };
