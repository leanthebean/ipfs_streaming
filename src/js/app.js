App = {
  web3Provider: null,
  contracts: {},

  init: function () {
    $.getJSON("/playlists").then(function (files) {
      for (i = 0; i < files.length; i++) {
        playlist = files[i]
        var playlistsRow = $('#playlistsRow');
        var playlistsTemplate = $('#playlistsTemplate');

        playlistsTemplate.find('.link').attr('href', '/play.html?video='+playlist);
        playlistsTemplate.find('.link').text(playlist)

        playlistsRow.append(playlistsTemplate.html());
      }

    })

    App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '.btn-pay', App.handleAdopt);
    $(document).on('click', '.btn-submit', App.handleClickUpload);
  },

  handleClickUpload: function () {
    document.getElementById('loader').style = "visibility:visible;"
  },

  handleAdopt: function () {
    var payInstance;

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0]

      App.contracts.Pay.deployed().then(function (instance) {
        payInstance = instance;

        return payInstance.pay({ from: account });

      }).then(function (result) {
        document.find('button').text('Success').attr('disabled', true);
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
