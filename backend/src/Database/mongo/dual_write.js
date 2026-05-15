/* Helper for "MySQL is source of truth, mirror to Mongo, never throw" semantics.
   Every dual-write call site looks the same:
     - MySQL commit has already happened
     - try the Mongo op
     - log loudly on failure, swallow the error
   so we centralize it here. */
export async function mirror(label, op) {
    try {
        const result = await op();
        console.log(`[mongo mirror] ${label} ok`);
        return result;
    } catch (err) {
        console.error(`[mongo mirror FAILED] ${label}:`, err.message);
        return null;
    }
}
