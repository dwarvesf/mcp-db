export async function handleGCSObjectsResource(gcs, bucket) {
    if (!gcs) {
        throw new Error("GCS not initialized");
    }
    if (!bucket) {
        throw new Error("GCS bucket not configured. Use --gcs-bucket argument or GCS_BUCKET environment variable");
    }
    const [files] = await gcs.bucket(bucket).getFiles();
    return files.map(file => ({
        name: file.name,
        updated: file.metadata.updated
    }));
}
