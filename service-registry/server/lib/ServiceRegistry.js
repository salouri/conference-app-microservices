const semver = require('semver');

class ServuceRegistry {
  constructor(log) {
    this.log = log;
    this.services = {};
    this.timeout = 300; // seconds
  }

  get(name, version) {
    this.cleanup();
    const candidateServices = Object.entries(this.services)
      .filter(item => item[1].name === name && semver.satisfies(item[1].version, version));
    let key = 0;
    let result;
    if (candidateServices.length > 0) {
      // sort by hits, and then by timestamp
      candidateServices.sort((a, b) => {
        if (a[1].hits < b[1].hits) {
          return -1;
        }
        if (a[1].hits > b[1].hits) {
          return 1;
        }
        // if a[1].hits === b[1].hits
        if (b[1].timestamp < a[1].timestamp) {
          return -1;
        }
        if (a[1].timestamp < b[1].timestamp) {
          return 1;
        }
        return 0;
      });
      // eslint-disable-next-line prefer-destructuring
      key = candidateServices[0][0];
      this.services[key].hits += 1;
      result = (({ hits, ...obj }) => obj)(this.services[key]); // clone service without hits
    }

    return result;
  }

  register(name, version, ip, port) {
    this.cleanup();

    const key = name + version + ip + port;

    if (!this.services[key]) {
      this.services[key] = {
        name,
        version,
        ip,
        port,
        hits: 0,
        timestamp: Math.floor(new Date() / 1000),
      };
      this.log.debug(`Added service ${name}, version: ${version}, at ${ip}:${port}`);
    }
    this.services[key].timestamp = Math.floor(new Date() / 1000);
    this.services[key].hits += 1;
    this.log.debug(`Updated service ${name}, version: ${version}, at ${ip}:${port}`);

    return key;
  }

  unregister(name, version, ip, port) {
    const key = name + version + ip + port;

    if (this.services[key]) {
      delete this.services[key];
      this.log.debug(`Deleted service ${name}, version: ${version}, at ${ip}:${port}`);
    } else {
      this.log.debug(`service not found ${name}, version: ${version}, at ${ip}:${port}`);
    }

    return key;
  }

  cleanup() {
    const now = Math.floor(new Date() / 1000);
    Object.keys(this.services).forEach((key) => {
      if (this.services[key].timestamp + this.timeout < now) {
        const {
          name, version, ip, port,
        } = this.services[key];
        delete this.services[key];
        this.log.debug(`Deleted service ${name}, version: ${version}, at ${ip}:${port}`);
      }
    });
  }
}

module.exports = ServuceRegistry;
