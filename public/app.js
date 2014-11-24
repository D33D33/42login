$(function () {
    var socket = io(),
        arpsEntries = [],
        users = [];

    var usersTb = $('#users').find('tbody');
    function updateUser() {
        usersTb.empty();

        function getUser(mac) {
            for (var iUser = 0; iUser < users.length; iUser++) {
                var user = users[iUser];
                if( user.mac === mac ) {
                    return user;
                }
            }
        }

        for (var i = 0; i < arpsEntries.length; i++) {
            var arp = arpsEntries[i];
            var user = getUser(arp.mac);

            if(!user) {
                user = {
                    name: arp.ip,
                    unknown: true
                }
            }

            var classe = user.unknown ? 'danger' : '',
                row = $('<tr class="' + classe + '"></tr>');
            row.append('<td>' + user.name + '</td>');
            row.append('<td>' + (user.twitter ? '@' + user.twitter : '') + '</td>');

            usersTb.prepend(row)
        }
    }

    socket.on('arps', function (data) {
        arpsEntries = data;
        updateUser();
    });

    socket.on('users', function (data) {
        users = data;
        updateUser();
    });

    var userForm = $('#user'),
        name = userForm.find('#nameInput'),
        twitter = userForm.find('#twitterInput'),
        user = {};
    socket.on('user', function (data) {
        if( data.err ) {
            userForm.empty();
            userForm.append('<p class="bg-danger">User not found</p>')
        }
        user = data;
        name.val(data.name);
        twitter.val(data.twitter);
    });

    userForm.find('button').on('click', function() {

        user.name = name.val();
        user.twitter = twitter.val();

        socket.emit('user', user);
        console.log('click');
    })
});
