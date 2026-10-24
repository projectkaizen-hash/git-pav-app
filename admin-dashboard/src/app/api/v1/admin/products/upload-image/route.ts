import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const { url, base64 } = await request.json();
      if (url) {
        return NextResponse.json({ url }, { headers: CORS_HEADERS });
      }
      if (base64) {
        // In dev or without Cloudinary credentials, return the data URI
        return NextResponse.json({ url: base64 }, { headers: CORS_HEADERS });
      }
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400, headers: CORS_HEADERS });
      }

      // Check if Cloudinary credentials exist
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (cloudName && (uploadPreset || (apiKey && apiSecret))) {
        // Upload to Cloudinary REST API directly
        const cFormData = new FormData();
        cFormData.append("file", file);
        if (uploadPreset) {
          cFormData.append("upload_preset", uploadPreset);
        }

        const cRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: cFormData,
        });

        if (cRes.ok) {
          const cData = await cRes.json();
          return NextResponse.json({ url: cData.secure_url, public_id: cData.public_id }, { headers: CORS_HEADERS });
        }
      }

      // Fallback to data URI when cloud credentials not set yet
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = file.type || "image/jpeg";
      const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;

      return NextResponse.json({ url: dataUri }, { headers: CORS_HEADERS });
    }

    return NextResponse.json({ error: "Unsupported media type" }, { status: 415, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST upload-image]", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
