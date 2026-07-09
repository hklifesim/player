(function setupI18nAssetLoader() {
  const defaultLanguage = "zh-Hant";
  const storageKey = "hklifesim.lang";

  const aliases = new Map([
    ["zh", "zh-Hant"],
    ["zh-hk", "zh-Hant"],
    ["zh-mo", "zh-Hant"],
    ["zh-tw", "zh-Hant"],
    ["zh-hant", "zh-Hant"],
    ["zh-cn", "zh-Hans"],
    ["zh-sg", "zh-Hans"],
    ["zh-hans", "zh-Hans"],
    ["en", "en"],
    ["en-us", "en"],
    ["en-gb", "en"]
  ]);

  const localizedAssets = new Map([
    ["assets/assets/events.json", "assets/assets/events.{lang}.json"],
    ["assets/assets/era_config.json", "assets/assets/era_config.{lang}.json"]
  ]);

  function normalizeLanguage(language) {
    if (!language) return null;

    const normalized = String(language).trim().toLowerCase().replace("_", "-");
    if (aliases.has(normalized)) return aliases.get(normalized);

    const shortCode = normalized.split("-")[0];
    return aliases.get(shortCode) || null;
  }

  function getRequestedLanguage() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = normalizeLanguage(params.get("lang"));
    if (fromUrl) {
      window.localStorage.setItem(storageKey, fromUrl);
      return fromUrl;
    }

    const fromStorage = normalizeLanguage(window.localStorage.getItem(storageKey));
    if (fromStorage) return fromStorage;

    for (const language of navigator.languages || [navigator.language]) {
      const fromBrowser = normalizeLanguage(language);
      if (fromBrowser) return fromBrowser;
    }

    return defaultLanguage;
  }

  const activeLanguage = getRequestedLanguage();

  function getLocalizedUrl(inputUrl) {
    if (activeLanguage === defaultLanguage) return null;

    const url = new URL(inputUrl, window.location.href);

    for (const [assetPath, localizedPattern] of localizedAssets.entries()) {
      if (!url.pathname.endsWith(assetPath)) continue;

      const localizedPath = localizedPattern.replace("{lang}", activeLanguage);
      url.pathname = url.pathname.slice(0, -assetPath.length) + localizedPath;
      return url.toString();
    }

    return null;
  }

  const nativeFetch = window.fetch.bind(window);

  function isJsonResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    return contentType === "" || contentType.includes("json");
  }

  window.fetch = async function fetchLocalizedAsset(resource, init) {
    const originalUrl = resource instanceof Request ? resource.url : String(resource);
    const localizedUrl = getLocalizedUrl(originalUrl);

    if (!localizedUrl) {
      return nativeFetch(resource, init);
    }

    try {
      const localizedResource = resource instanceof Request
        ? new Request(localizedUrl, resource)
        : localizedUrl;
      const localizedResponse = await nativeFetch(localizedResource, init);

      if (localizedResponse.ok && isJsonResponse(localizedResponse)) {
        console.info("[i18n] Loaded localized asset:", localizedUrl);
        return localizedResponse;
      }

      console.warn("[i18n] Localized asset missing, falling back:", localizedUrl);
    } catch (error) {
      console.warn("[i18n] Localized asset failed, falling back:", localizedUrl, error);
    }

    return nativeFetch(resource, init);
  };

  window.HKLifeSimI18n = {
    getLanguage() {
      return activeLanguage;
    },
    setLanguage(language) {
      const nextLanguage = normalizeLanguage(language);
      if (!nextLanguage) {
        throw new Error("Unsupported language: " + language);
      }

      window.localStorage.setItem(storageKey, nextLanguage);
      window.location.reload();
    },
    clearLanguage() {
      window.localStorage.removeItem(storageKey);
      window.location.reload();
    }
  };
})();
