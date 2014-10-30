var fs = require('fs');

fs.readFile('dhcpd.leases', function (err, data) {
  if (err) throw err;
  console.log(data);
});
