// Fallback for environments where localStorage/sessionStorage are blocked
// (e.g. some embedded WebViews, private/incognito modes, or iframes with
// storage access restrictions). Without this, any read/write to
// localStorage/sessionStorage would throw and crash the app on boot,
// since several screens (login cache, last GPS position, etc.) rely on it.
//
// We probe storage once; if it throws, we replace it with a no-op
// in-memory stub so the rest of the app can call the same API safely
// (values just won't persist across reloads in that environment).
(function () {
  try {
    localStorage.getItem("teste");
  } catch (e) {
    var memoriaFalsa = {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {},
      clear: function () {},
    };
    Object.defineProperty(window, "localStorage", { value: memoriaFalsa });
    Object.defineProperty(window, "sessionStorage", { value: memoriaFalsa });
  }
})();
