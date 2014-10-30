var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    fs = require('fs'),
    child_process = require('child_process'),
    _ = require('underscore'),
    Datastore = require('nedb'),
    db = new Datastore({ filename: 'user.db', autoload: true });

port = process.env.PORT || 3001;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(bodyParser.json());
app.use(morgan('dev'));

var leases = [],
    arps = [];

function getLeases (cb) {
    // /var/lib/dhcp/dhcpd.leases
    fs.readFile('dhcpd.leases', 'utf8', function (err, data) {
        if (err) {
            throw err;
        }
        var lines = data.split('\n');

        var leases = [],
            tmp = {},
            asLease = false;
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            if (l.indexOf('lease') === 0) {
                asLease = true;
            }

            if (asLease) {
                if (l.indexOf('lease') === 0) { // IP
                    tmp.ip = l.split(' ')[1];
                }
                else if (l.indexOf('binding state') !== -1 && l.indexOf('next') === -1 && l.indexOf('rewind') === -1) { // state
                    var state = l.split(' ')[4];
                    tmp.state = state.substr(0, state.length - 1);
                }
                else if (l.indexOf('hardware ethernet') !== -1) { // MAC
                    var mac = l.split(' ')[4];
                    tmp.mac = mac.substr(0, mac.length - 1);
                }
                else if (l.indexOf('client-hostname') !== -1) { // Hostname
                    tmp.host = l.substring(19, l.length - 2);
                }
                else if (l.indexOf('starts') !== -1) { // Hostname
                    var start = l.split(' ')[4] + ' ' + l.split(' ')[5]
                    tmp.start = start.substr(0, start.length - 1);
                }
                else if (l.indexOf('ends') !== -1) { // Hostname
                    var end = l.split(' ')[4] + ' ' + l.split(' ')[5]
                    tmp.end = end.substr(0, end.length - 1);
                }
            }

            if (l.indexOf('}') === 0) {
                asLease = false;
                if (tmp) {
                    leases.push(tmp);
                }
                tmp = {};
            }
        }

        cb(leases);
    });
}

function getArp (cb) {
    child_process.execFile('arp', ['-n', '-i', 'wlan0'], function (err, stdout) {
        if (err) {
            throw err;
        }
        var lines = stdout.split('\n');

        var arps = [];
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            if (l.indexOf('ether') !== -1) {
                var segs = l.split(/\s+/);
                arps.push({
                    ip: segs[0],
                    mac: segs[2]
                })
            }
        }
        cb(arps);
    });
}

function leasesUpdater () {
    getLeases(function (lea) {
        leases = lea;
        io.to('clients').emit('leases', leases);
    });

    setTimeout(leasesUpdater, 5000);
}
leasesUpdater();

function arpUpdater () {
    getArp(function (a) {
        arps = a;
        io.to('clients').emit('arps', arps);
    });

    setTimeout(arpUpdater, 5000);
}
arpUpdater();

io.on('connection', function (socket) {
    var ip = socket.handshake.address;
    ip = '192.168.10.1';
    console.log(ip);
    getArp(function (arps) {
        var mac;
        for (var i = 0; i < arps.length; i++) {
            if (arps[i].ip === ip) {
                mac = arps[i].mac;
            }
        }
        if (!mac) {
            console.error('ip not found : ' + ip);
            socket.emit('user', {
                err: 'Not found'
            });
            return;
        }

        db.find({ mac: mac }, function (err, docs) {
            if (!docs.length) {
                socket.emit('user', {mac: mac});
                return;
            }

            socket.emit('user', docs[0]);
        });

    });

    socket.join('clients');

    socket.on('disconnect', function () {
        console.log('a user disconnect');
    });

    socket.on('user', function (user) {
        db.find({ mac: user.mac }, function (err, docs) {
            var u = {};
            if (docs.length) {
                u = docs[0];
            }

            _.extend(u, user);

            db.insert(u, function (err) {
                if (err) {
                    throw err;
                }

                db.find({}, function (err, docs) {
                    io.to('clients').emit('users', docs);
                });
            });
        });
    });

    socket.emit('leases', leases);
    socket.emit('arps', arps);
    db.find({}, function (err, docs) {
        socket.emit('users', docs);
    });

    console.log('a user connect');
});

app.use(express.static(__dirname + '/public'));

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// LOGGING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.use(function logErrors (err, req, res, next) {
    console.error(err.stack);
    next(err);
});

app.use(function clientErrorHandler (err, req, res, next) {
    if (req.xhr) {
        res.status(500).send({ error: 'Something blew up!' });
    } else {
        next(err);
    }
});

app.use(function errorHandler (err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
});

