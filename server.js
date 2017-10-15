var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var ffmpeg = require('fluent-ffmpeg');
var mkdirp = require('mkdirp');
var Promise = require('promise');
var rimraf = require('rimraf');

var express = require('express')
var path = require('path')
var serveStatic = require('serve-static')

var ipfsAPI = require('ipfs-api')
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'})

// const IPFS = require('ipfs')
// const ipfs = new IPFS()

const defaultPlaylistName = "index.m3u8"

var app = express()

app.use(serveStatic(path.join(__dirname, 'src')))
app.use(serveStatic(path.join(__dirname, 'playlists')))
app.use(serveStatic(path.join(__dirname, 'build/contracts')))

app.use('/playlists', function (req, res, next) { 
  res.send(JSON.stringify(fs.readdirSync("./playlists")));
})

app.use('/fileupload', function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {

    var name = files.filetoupload.name.substring(0, files.filetoupload.name.indexOf('.'))
    var oldpath = files.filetoupload.path;
    var outputDirectory = './uploads/' + name;

    mkdirp(outputDirectory)

    ffmpeg(oldpath, { timeout: 432000 })
      .addOption('-level', 3.0)
      .addOption('-s', '640x360')
      .addOption('-start_number', 0)
      .addOption('-hls_time', 10)
      .addOption('-hls_list_size', 0)
      .format('hls')
      .on('start', function (cmd) {
        console.log('Started ' + cmd);
      })
      .on('error', function (err) {
        console.log('an error happened: ' + err.message);
      })
      .on('end', function () {
        console.log('File has been converted succesfully');
        uploadToIpfs(outputDirectory, name).then(function (err) { 
          if (!err) { 
              cleanup(outputDirectory)
              res.redirect(301, "/");
              res.end();
          }
        })
      })
      .save(outputDirectory + "/" + defaultPlaylistName)
  });
});

function uploadToIpfs(outputDirectory, name) {
  return new Promise(function (resolve, reject) {
   uploadFiles = []

    var files = fs.readdirSync(outputDirectory);
    files
      .filter(file => file.substr(file.indexOf('.'), file.length) != "m3u8")
      .forEach(function (file) {
        uploadFiles.push({
          path: name + "/" + file,
          content: fs.createReadStream(outputDirectory + "/" + file)
        })
      })

    ipfs.files.add(uploadFiles, function (err, files) {
      if (!err) {
        console.log("uploaded to ipfs")
      } else { 
        resolve(err)
      }
      console.log(files)

      fs.readFile(outputDirectory + "/" + defaultPlaylistName, "utf8", function(err, data) {
        files.forEach(function(ipfsHash) { 
          split = ipfsHash.path.split('/')
          segment = split[split.length-1]

          data = data.replace(segment, "http://localhost:8080/ipfs/"+ipfsHash.hash)
        })

        fs.writeFile("./playlists/" + name + ".m3u8", data, "utf8", function(err) { 
          if (err) { 
            console.log("couldn't save the playlist file to playlist directory")
          } else { 
            resolve(err)
          }
        })
      });
    })
  })
}

function cleanup(directory) { 
  rimraf(directory, function (err) { 
    if (err) { 
      console.log("oops.. didn't cleanup correctly")
      console.log(err)
    }
  });
}

app.listen(3000)
