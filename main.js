var express       = require('express'),
    app           = express(),
    server        = require('http').createServer(app),
    io            = require('socket.io')(server),
    bodyParser    = require('body-parser'),
    morgan        = require('morgan'),
    fs            = require('fs'),
    child_process = require('child_process'),
    _             = require('underscore'),
    Datastore     = require('nedb'),
    db            = new Datastore({filename: 'user.db', autoload: true}),
    sequest       = require('sequest');

port = process.env.PORT || 3001;

server.listen(port, function ()
{
    console.log('Server listening at port %d', port);
});

app.use(bodyParser.json());
app.use(morgan('dev'));

var arps = [];
var seq = sequest.connect({
    host: '192.168.10.1',
    username: 'root',
    password: 'Linux'
});
function getArp (cb)
{
    seq('arp -n -i br0', function (err, stdout)
    {
        if (err)
        {
            throw err;
        }
   //     seq.end();

        var lines = stdout.split('\n');

        var arps = [];
        for (var i = 0; i < lines.length; i++)
        {
            var l = lines[i];
            if (l.indexOf('ether') !== -1)
            {
                var segs = l.split(/\s+/);
                arps.push({
                    ip: segs[1].substr(1, segs[1].length - 2),
                    mac: segs[3]
                })
            }
        }
        cb(arps);
    });
}

function arpUpdater ()
{
    getArp(function (a)
    {
        arps = a;
        io.to('clients').emit('arps', arps);
        setTimeout(arpUpdater, 5000);
    });
}
arpUpdater();

io.on('connection', function (socket)
{
    var ip = socket.handshake.address;
    console.log(ip);

    var mac;
    for (var i = 0; i < arps.length; i++)
    {
        if (arps[i].ip === ip)
        {
            mac = arps[i].mac;
        }
    }
    if (!mac)
    {
        console.error('ip not found : ' + ip);
        socket.emit('user', {
            err: 'Not found',
            ip: ip
        });
        return;
    }

    db.find({mac: mac}, function (err, docs)
    {
        if (!docs.length)
        {
            socket.emit('user', {mac: mac});
            return;
        }

        socket.emit('user', docs[0]);
    });

    socket.join('clients');

    socket.on('disconnect', function ()
    {
        console.log('a user disconnect');
    });

    socket.on('user', function (user)
    {
        db.update({mac: user.mac}, user, {upsert: true}, function (err)
        {
            if (err)
            {
                throw err;
            }

            db.find({}, function (err, docs)
            {
                io.to('clients').emit('users', docs);
            });
        });
    });

    socket.emit('arps', arps);
    db.find({}, function (err, docs)
    {
        socket.emit('users', docs);
    });

    console.log('a user connect');
});

app.use(express.static(__dirname + '/public'));

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// LOGGING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.use(function logErrors (err, req, res, next)
{
    console.error(err.stack);
    next(err);
});

app.use(function clientErrorHandler (err, req, res, next)
{
    if (req.xhr)
    {
        res.status(500).send({error: 'Something blew up!'});
    }
    else
    {
        next(err);
    }
});

app.use(function errorHandler (err, req, res, next)
{
    res.status(500);
    res.render('error', {error: err});
});
