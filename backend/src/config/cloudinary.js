import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (buffer, folderName) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: folderName, resource_type: "auto" },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });

/* Per-company folder layout in Cloudinary:
       takhlees/<company-slug>/logo
       takhlees/<company-slug>/compreg
       takhlees/<company-slug>/documents
   The slug is the company name lowercased with non-alphanumerics collapsed to
   single hyphens, so "Cairo Logistics Co." -> "cairo-logistics-co". Cloudinary
   folder names must avoid `/` and most punctuation, hence the strict mapping. */
const slugifyCompanyName = (name) =>
    String(name ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "unnamed";

/* Root Cloudinary folder that already exists in the account. Every new
   upload lands underneath it as: <ROOT>/<company-slug>/<sub>. */
const ROOT_FOLDER = "takhlees production";

export const companyFolder = (companyName, sub) => {
    const slug = slugifyCompanyName(companyName);
    const allowed = new Set(["logo", "compreg", "documents"]);
    if (!allowed.has(sub)) {
        throw new Error(`companyFolder: unknown sub "${sub}". Use one of: ${[...allowed].join(", ")}.`);
    }
    return `${ROOT_FOLDER}/${slug}/${sub}`;
};

/* Pull the public_id out of a Cloudinary secure_url. Cloudinary URLs
   look like:
     https://res.cloudinary.com/<cloud>/image/upload/[<transforms>/]v123/<folder>/<name>.<ext>
   The public_id is everything after the optional `v<digits>` segment,
   minus the file extension. Returns null for anything that doesn't
   look like a Cloudinary URL so callers can no-op safely. */
export const extractCloudinaryPublicId = (url) => {
    if (!url || typeof url !== "string") return null;
    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split("/").filter(Boolean);
        const uploadIdx = segments.indexOf("upload");
        if (uploadIdx === -1) return null;
        let rest = segments.slice(uploadIdx + 1);
        if (rest.length && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
        if (!rest.length) return null;
        const last = rest[rest.length - 1];
        const dot = last.lastIndexOf(".");
        rest[rest.length - 1] = dot >= 0 ? last.slice(0, dot) : last;
        return rest.join("/");
    } catch {
        return null;
    }
};

/* Best-effort delete of a Cloudinary asset by its secure_url. Swallows
   errors (logs a warning) so a failed cleanup — typically because the
   asset was already removed from the Cloudinary dashboard — never
   blocks the surrounding business logic. */
export const destroyCloudinaryAsset = async (secureUrl) => {
    const publicId = extractCloudinaryPublicId(secureUrl);
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.warn(`[cloudinary] destroy failed for ${publicId}:`, err?.message || err);
    }
};

export default cloudinary;
