$(function () {
    var socket = io(),
        arpsEntries = [],
        leasesEntries = [],
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
        function getLease(mac) {
            for (var iLease = 0; iLease < leasesEntries.length; iLease++) {
                var lease = leasesEntries[iLease];
                if( lease.mac === mac ) {
                    return lease;
                }
            }
        }

        for (var i = 0; i < arpsEntries.length; i++) {
            var arp = arpsEntries[i];
            var user = getUser(arp.mac);

            if(!user) {
                var lease = getLease(arp.mac);
                user = {
                    name: lease ? lease.host : arp.ip,
                    fromLease: true
                }
            }

            var classe = user.fromLease ? 'danger' : '',
                row = $('<tr class="' + classe + '"></tr>');
            row.append('<td>' + user.name + '</td>');
            row.append('<td>' + (user.twitter ? '@' + user.twitter : '') + '</td>');

            usersTb.prepend(row)
        }
    }

    socket.on('leases', function (data) {
        leasesEntries = data;
        updateUser();
    });

    socket.on('arps', function (data) {
        arpsEntries = data;
        updateUser();
    });

    socket.on('users', function (data) {
        users = data;
        updateUser();
    });
});
