const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const context = { exports: {}, Blob, Uint8Array };
const source = fs.readFileSync(`${__dirname}/src/utils/documentPreview.ts`, 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context);
const { prepareDocumentPreview } = context.exports;

test('PDF returned as binary data is recognized and its bytes preserved', async () => {
  const content = '%PDF-1.7\nexample';
  const preview = await prepareDocumentPreview(new Blob([content], { type: 'application/octet-stream' }));
  assert.equal(preview.type, 'application/pdf');
  assert.equal(await preview.text(), content);
});

test('invalid PDF or HTML cannot enter the PDF frame', async () => {
  await assert.rejects(prepareDocumentPreview(new Blob(['<html>unexpected response</html>'], { type: 'application/pdf' })), /not a valid PDF/);
});

test('JPEG and PNG retain their image type and bytes', async () => {
  for (const type of ['image/jpeg', 'image/png']) {
    const image = new Blob([new Uint8Array([0, 1, 2, 3])], { type });
    assert.equal(await prepareDocumentPreview(image), image);
  }
});

test('text MIME parameters are normalized for the separate sandboxed text viewer', async () => {
  const preview = await prepareDocumentPreview(new Blob(['notes'], { type: 'text/plain; charset=utf-8' }));
  assert.equal(preview.type, 'text/plain');
});
