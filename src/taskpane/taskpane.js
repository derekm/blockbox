/*
 * Copyright (c) Derek P. Moore. All rights reserved.
 */
let run;
let filename;
let filetype;
let privateKey;
let address;

let utxos = [];
let readyUtxos = [];
let uncomfirmedUtxos = [];
let spendUtxos = [];
let balance;

let splitCount;
let cost = 0;

const data = [];
const txns = [];

const chunkSize = 90e3;
const splitValue = 90.5e3;
let chunks = 0;
let requiredTxns;

Office.onReady(info => {
  if (info.host === Office.HostType.Word
      || info.host === Office.HostType.Excel
      || info.host === Office.HostType.PowerPoint) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    document.getElementById("reload").onclick = reload;
    document.getElementById("split").onclick = split;
    document.getElementById("upload").onclick = upload;
    document.getElementById("refund").onclick = refund;
  }
  if (info.host === Office.HostType.Word)  {
    run = Word.run;
    filetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (info.host === Office.HostType.Excel) {
    run = Excel.run;
    filetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else if (info.host === Office.HostType.PowerPoint) {
    run = PowerPoint.run;
    filetype = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  let wif = Office.context.document.settings.get('privateKey');

  if (wif) {
    console.log(wif);//L1T1C8P66Yb2JmTTLP9qxbD7wjMpYkrFdCPp43WwKSGbPMKNnzZa
    //L1nzgv35FDK3E9Dod3MVyirhbn4VqCuA5VQneum4dwb86qkdxVMX
    //L3YUgLhZpyVyviQxmpZbe8KkUe99f1fC5bg5vaZgvyWbu6Zj3kDj
    privateKey = bsv.PrivateKey.fromWIF(wif);
    console.log(privateKey);
  }
  if (!privateKey) {
    privateKey = bsv.PrivateKey.fromRandom();
    Office.context.document.settings.set('privateKey', privateKey.toWIF());
    Office.context.document.settings.saveAsync(saveResult => console.log(saveResult));
  }

  address = privateKey.toAddress();
  document.getElementById('address').innerHTML = address;

  const qr = qrcode(0, 'L');
  qr.addData(`bitcoin:${address}?sv`);
  qr.make();
  document.getElementById('qrcode').innerHTML = qr.createImgTag();

  buildTxsFromFile();
  retrieveUtxosForDocumentPrivateKey();

  let el = document.createElement('a');
  el.href = Office.context.document.url;
  filename = el.pathname.split("/").pop();
console.log(filename);
});

export async function reload() {
  return run(async context => {
    retrieveUtxosForDocumentPrivateKey();

    // insert a paragraph at the end of the document.
    //const paragraph = context.document.body.insertParagraph("Hello World", Word.InsertLocation.end);

    // change the paragraph color to blue.
    //paragraph.font.color = "blue";

    // await context.sync();
  });
}

export async function split() {
  return run(async context => {
    let transaction = new bsv.Transaction().from(spendUtxos);
    for (let i = 0; i < splitCount; i++) {
      if (i + 1 == splitCount) {
        transaction.change(address);
      } else {
        transaction.to(address, splitValue);
      }
    }

    transaction.change(address);
    transaction.sign(privateKey);

    fetch('https://api.bitindex.network/api/tx/send', {
      method: 'POST',
      body: JSON.stringify({rawtx: transaction.toString()}),
      headers: {
        api_key: '22qtEpsphEv2ZtP8JkBiKD65bLQ26PxyJ66obK42uCGeb3b8MetH1bK5n4xEF3yxQ4',
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((res) => console.log(res))
      .then(() => retrieveUtxosForDocumentPrivateKey());

    retrieveUtxosForDocumentPrivateKey();
    // await context.sync();
  });
}

export async function upload() {
  return run(async context => {

    let bTxn;
    if (chunks > 1) {
      for (var i = 0; i < chunks; i++) {
        console.log(data[i]);
        let uint8 = Uint8Array.from(data[i]);
        console.log(uint8);
        let chunk = bsv.deps.Buffer.from(uint8);
        console.log(chunk);
        let txn = new bsv.Transaction()
            .from(readyUtxos[i])
            .addData(['1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL', chunk]);
        if (chunk.byteLength < chunkSize - 546) {
            txn.change(address);
        }

        txn.sign(privateKey);
        txns.push(txn);
      }

      bTxn = new bsv.Transaction()
        .from(spendUtxos)
        .addData([
            '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up',
            'blockbox.xyz',
            filetype,
            bsv.deps.Buffer.from('20', 'hex'),
            filename,
            bsv.deps.Buffer.from('20', 'hex'),
            ...txns.map((txn) => bsv.deps.Buffer.from(txn.hash, 'hex')),
        ])
        .change(address)
        .sign(privateKey);

      txns.push(bTxn);

    } else {
      console.log(data[0]);
      let uint8 = Uint8Array.from(data[0]);
      console.log(uint8);
      let chunk = bsv.deps.Buffer.from(uint8);
      console.log(chunk);

      bTxn = new bsv.Transaction()
        .from(readyUtxos[0])
        .addData([
          '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut',
          chunk,
          filetype,
          bsv.deps.Buffer.from('20', 'hex'),
          filename
        ]);
      if (chunk.byteLength < chunkSize - 546) {
        bTxn.change(address);
      }
      bTxn.sign(privateKey);
      txns.push(bTxn);

    }

    let dTxn = new bsv.Transaction()
      .from(readyUtxos[i])
      .addData([
        '19iG3WTYSsbyos3uJ733yK4zEioi1FesNU',
        filename,
        '' + bTxn.hash,
        'b',
        '' + +new Date(),
      ])
      .change(address)
      .sign(privateKey);

    txns.push(dTxn);

    i = 0;
    txns
      .reduce((acc, txn) => {
        console.log(txn.toString());
        return acc.then(() => {
          document.getElementById('txid').innerText = `Uploading ${++i} of ${txns.length}`;
          return fetch('https://api.bitindex.network/api/v2/tx/send', {
            method: 'POST',
            body: JSON.stringify({hex: txn.toString()}),
            headers: {
              api_key: '22qtEpsphEv2ZtP8JkBiKD65bLQ26PxyJ66obK42uCGeb3b8MetH1bK5n4xEF3yxQ4',
              'Content-Type': 'application/json',
            },
          }).then((res) => {
            if (!res.ok) {
              return Promise.reject(res.json());
            }
          });
        });
      }, Promise.resolve())
      .catch(console.error)
      .then(() => {
        let dUrl = address + '/' + filename;
        document.getElementById('txid').innerHTML =
          '<a href="https://bico.media/' +
          bTxn.hash +
          '" target="_blank">Bico.Media/' + bTxn.hash + '</a><br>' +
          'B://' +
          bTxn.hash + "<br>" +
          'D://' + dUrl + "<br>";
        // retrieveUtxosForDocumentPrivateKey();
        document.getElementById("upload").style.display = "none";
      });

    console.log('bcat:', bTxn.hash);
    console.log('d:', dTxn.hash);

    // await context.sync();
  });
}

export async function refund() {
  return run(async context => {

    let refundAddress = bsv.Address.fromString(document.getElementById('refundAddress').value);
    let total = utxos.reduce((acc, utxo) => {
      return acc + utxo.satoshis;
    }, 0);

    let txn = new bsv.Transaction()
      .from(utxos)
      .change(refundAddress)
      .sign(privateKey);
    return fetch('https://api.bitindex.network/api/v2/tx/send', {
      method: 'POST',
      body: JSON.stringify({hex: txn.toString()}),
      headers: {
        api_key: '22qtEpsphEv2ZtP8JkBiKD65bLQ26PxyJ66obK42uCGeb3b8MetH1bK5n4xEF3yxQ4',
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((res) => {
        console.log(res);
        document.getElementById('refund-txid').innerText = txn.hash;
        retrieveUtxosForDocumentPrivateKey();
      });

    // await context.sync();
  });
}

function buildTxsFromFile() {

  Office.context.document.getFileAsync(
    Office.FileType.Compressed,
    {
      sliceSize: chunkSize
    },
    async fileResult => {
      // console.log(fileResult);
      if (fileResult.status === "succeeded") {
        let file = fileResult.value;

        chunks = file.sliceCount;
        requiredTxns = chunks + (chunks > 1 ? 2 : 1);
        document.getElementById('requiredTxns').innerText = "0/" + chunks + "/" + requiredTxns;

        let offset = 0;

        function buildTxFromSliceResult(sliceResult) {
          if (sliceResult.status === "succeeded") {
            let chunk = sliceResult.value;
            console.log("Slice " + chunk.index + " of size " + chunk.size);
            data.push(chunk.data);

            let count = offset + 1;
            document.getElementById('requiredTxns').innerText = count + "/" + chunks + "/" + requiredTxns;            
          } else {
            console.error(sliceResult.error);
          }

          if (++offset < file.sliceCount) {
            file.getSliceAsync(offset, buildTxFromSliceResult);
          } else {
            file.closeAsync();
          }
        }

        file.getSliceAsync(offset, buildTxFromSliceResult);

        // file.closeAsync();
      } else {
        console.error(fileResult.error);
      }
    }
  );

}

function retrieveUtxosForDocumentPrivateKey() {
  document.getElementById('confirmed').innerText = "?";
  document.getElementById('unconfirmed').innerText = "?";
  document.getElementById('unsplit').innerText = "?";

  fetch('https://api.bitindex.network/api/v2/addrs/utxos?address=' + address, {
    headers: {
      api_key: '5eTuVfKYpWiaRWaEBN5NF1VPKf9Tvm2HBXh9mmigjNG2iC94ZCnut1SMb3sNV4hwV4',
    },
  })
    .then((res) => res.json())
    .then(({data}) => {
      utxos = data;
      readyUtxos = utxos.filter((utxo) => {
        return utxo.satoshis == splitValue && utxo.height > 0
      });
      uncomfirmedUtxos = utxos.filter((utxo) => {
        return utxo.satoshis == splitValue && !(utxo.height > 0)
      });
      spendUtxos = utxos.filter((utxo) => utxo.satoshis != splitValue);

      balance = spendUtxos.reduce((balance, utxo) => {
        return balance + utxo.satoshis;
      }, 0);

      splitCount = requiredTxns - readyUtxos.length;
      document.getElementById('splitCount').innerText = splitCount;
      cost = (splitCount * splitValue) / 100000000;
      document.getElementById('cost').innerText = cost;
      document.getElementById('confirmed').innerText = readyUtxos.length;
      document.getElementById('unconfirmed').innerText = uncomfirmedUtxos.length;
      document.getElementById('unsplit').innerText = spendUtxos.length;
      document.getElementById('balance').innerText =
        (
          utxos.reduce((balance, utxo) => {
            return balance + utxo.satoshis;
          }, 0) / 100000000
        ).toFixed(8) + '🐉';

      if (balance == 0) {
        document.getElementById("welcome-text").style.display = "black";
        document.getElementById("reload").style.display = "block";
        document.getElementById("anchor-split-text").style.display = "none";
        document.getElementById("anchor-confirm-text").style.display = "none";
        document.getElementById("split").style.display = "none";
        document.getElementById("upload-text").style.display = "none";
        document.getElementById("upload").style.display = "none";
      }
      if (chunks > 0
          && ((chunks < readyUtxos.length || chunks < uncomfirmedUtxos.length)
              || (chunks > readyUtxos.length && chunks > uncomfirmedUtxos.length))
          && balance > (chunks * splitValue) / 100000000) {
        document.getElementById("welcome-text").style.display = "none";
        document.getElementById("reload").style.display = "block";
        document.getElementById("anchor-split-text").style.display = "block";
        document.getElementById("split").style.display = "block";
      }
      if (chunks > 0 && chunks <= uncomfirmedUtxos.length) {
        document.getElementById("welcome-text").style.display = "none";
        document.getElementById("anchor-split-text").style.display = "none";
        document.getElementById("split").style.display = "none";
        document.getElementById("anchor-confirm-text").style.display = "block";
        document.getElementById("reload").style.display = "block";
      }
      if (chunks > 0 && chunks <= readyUtxos.length) {
        document.getElementById("welcome-text").style.display = "none";
        document.getElementById("anchor-split-text").style.display = "none";
        document.getElementById("anchor-confirm-text").style.display = "none";
        document.getElementById("split").style.display = "none";
        document.getElementById("reload").style.display = "none";
        document.getElementById("upload-text").style.display = "block";
        document.getElementById("upload").style.display = "block";
      }

    });
}
