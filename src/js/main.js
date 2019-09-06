const {app, BrowserWindow} = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		autoHideMenuBar: true,
		webPreferences: {
			nodeIntegration: true
		}
	});
	mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
	mainWindow.on("closed", () => mainWindow = null);
}

app.on("ready", createWindow);
app.on("window-all-closed", () => {
	// On macOS applications conventionally stay active in the background.
	if (process.platform !== "darwin") {
		app.quit();
	}
});
app.on("activate", () => {
	if (mainWindow != null) {
		createWindow();
	}
});
