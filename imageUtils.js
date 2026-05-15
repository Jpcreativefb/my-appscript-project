function listFolderImages() {

  const folderId = '1h8nqwWlU2M-bz5UrpDU5-pbwaa-gqEtN';
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();

  const output = [
    ["File Name", "File ID", "NomineeId"] // ✅ HEADER
  ];

  function clean(str){
    return (str || "")
      .toString()
      .toLowerCase()
      .replace(/\.[^/.]+$/, "") // remove extension
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-|-$/g,"");
  }

  while (files.hasNext()) {

    const file = files.next();

    const name = file.getName();
    const id = file.getId();
    const nomineeId = clean(name); // ✅ GENERATED ID

    output.push([name, id, nomineeId]);
  }

  const sh = SpreadsheetApp.getActive().getSheetByName('NomineeImages');

  if (sh) {
    sh.clear();
    sh.getRange(1,1,output.length,output[0].length).setValues(output);
  }

  Logger.log("✅ Image list generated with NomineeId");

}