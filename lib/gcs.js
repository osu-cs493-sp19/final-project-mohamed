const { Readable } = require('stream');

const { Storage } = require('@google-cloud/storage');

const bucketName = '493final-submissions'

async function uploadFile(filename, buffer, mimetype) {
  const storage = new Storage();
  const bucket = storage.bucket(bucketName)
  const gcsFile = bucket.file(filename)

  const fileStream = new Readable();
  fileStream.push(buffer);
  fileStream.push(null);
  fileStream
    .pipe(gcsFile.createWriteStream({
      metadata: {
        contentType: mimetype
      }
    }))
    .on('error', (err) => { throw err })
    .on('finish', () => {})
}
exports.uploadFile = uploadFile

async function createSignedUrl(filename) {
  const storage = new Storage();
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 30 * 60 * 1000, // 15 minutes
  }

  const [url] = await storage
    .bucket(bucketName)
    .file(filename)
    .getSignedUrl(options);

  return url
}
exports.createSignedUrl = createSignedUrl
