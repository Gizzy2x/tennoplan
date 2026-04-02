//#region safeImport.ts
/**
* Safely require path, fall back to fallback if module cannot load
* @param  {string} path    Path to attempt to load
* @param  {Object} fallback fallback response if error or no module
* @returns {Promise<any>}         module or the default object
*/
const safeImport = async (path, fallback = {}) => {
	try {
		const mod = path.includes(".json") ? await import(path, { with: { type: "json" } }) : await import(path);
		return "default" in mod ? mod.default : mod;
	} catch (error) {
		if ((process.env.LOG_LEVEL || "ERROR").toUpperCase() === "DEBUG") console.debug(`Failed to load module at ${path} ... returning fallback`);
		return fallback;
	}
};
//#endregion
export { safeImport as t };
