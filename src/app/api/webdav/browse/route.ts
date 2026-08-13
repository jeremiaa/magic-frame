import { NextRequest, NextResponse } from "next/server";
import { createClient } from "webdav";
import { normalizeWebdavUrl, countWebdavImages } from "@/lib/wallpaper-engine/webdav";

export async function POST(req: NextRequest) {
  try {
    const { url, username, password, path = "/" } = await req.json();

    if (!url || !username || !password) {
      return new NextResponse("Missing WebDAV connection details", { status: 400 });
    }

    const client = createClient(normalizeWebdavUrl(url), { username, password });
    
    // Test if directory exists / list contents
    const directoryItems = await client.getDirectoryContents(path);

    // Filter only directories and exclude Synology specific hidden directories
    const folders = (directoryItems as any[]).filter(item => 
      item.type === "directory" && 
      !item.filename.toLowerCase().includes("@eadir") &&
      !item.filename.toLowerCase().includes("#recycle")
    ).map(item => ({
      basename: item.basename,
      filename: item.filename, // full path on server
    }));

    // Sort alphabetically
    folders.sort((a, b) => a.basename.localeCompare(b.basename));

    // Wie viele Bilder liegen im aktuell geöffneten Ordner? Der Inhalt ist eh
    // schon geladen, kostet also nichts — und der Nutzer sieht beim Auswählen,
    // ob dieser Ordner überhaupt etwas hergibt, statt erst am schwarzen
    // Bildschirm zu merken, dass nichts passt (#80).
    const images = countWebdavImages(directoryItems as any[]);

    return NextResponse.json({ folders, path, images });
  } catch (error: any) {
    console.error("WebDAV Browse Error:", error);
    
    // Provide a neat error depending on what failed
    let errorMessage = "Konnte Ordner nicht laden. NAS nicht erreichbar oder falscher Pfad.";
    if (error.response && error.response.status === 401) {
      errorMessage = "Falscher Benutzername oder Passwort.";
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
