
console.log('Initializing lightstrip controller...');
require('./controllers/lightstrip').open(function(error, results) {
  if (error) {
    console.log('ERROR: Could not initiate lightstrip controller: ', error);
    return process.exit(1);
  }

  console.log("Lightstrip engaged!");
  console.log("Starting glowstrip!");

  require('./lib/controllers/glowstrip');
});
