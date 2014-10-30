$(function () {
    var socket = io();

    var leases = $('#leases').find('tbody');

    socket.on('leases', function (data) {
        leases.empty();

        for (var i = 0; i < data.length; i++) {
            var lease = data[i],
                row = $('<tr></tr>');
            row.append('<td>' + lease.host + '</td>');
            row.append('<td>' + lease.ip + '</td>');
            row.append('<td>' + lease.mac + '</td>');
            row.append('<td>' + lease.state + '</td>');
            row.append('<td>' + lease.start + '</td>');
            row.append('<td>' + lease.end + '</td>');

            leases.prepend(row)
        }
    });


    var arps = $('#arps').find('tbody');
    socket.on('arps', function (data) {
        arps.empty();

        for (var i = 0; i < data.length; i++) {
            var arp = data[i],
                row = $('<tr></tr>');
            row.append('<td>' + arp.ip + '</td>');
            row.append('<td>' + arp.mac + '</td>');

            arps.append(row)
        }
    });

    var users = $('#users').find('tbody');
    socket.on('users', function (data) {
        users.empty();

        for (var i = 0; i < data.length; i++) {
            var user = data[i],
                row = $('<tr></tr>');
            row.append('<td>' + user.name + '</td>');
            row.append('<td>' + user.twitter + '</td>');
            row.append('<td>' + user.mac + '</td>');

            users.append(row)
        }
    });
});
