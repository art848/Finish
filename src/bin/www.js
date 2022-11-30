// Standard modules
import 'dotenv/config';
import 'regenerator-runtime';

// Modules from this project
import cluster from 'cluster';
import UrlService from '../services/UrlService';
import { UrlsModel } from '../models';
import db from '../../knex.config';

const knex = require('knex')(db.option);

let start = 0;
let end = 1;
const step = 20;
let worker;
const limit = 4000;

async function isPrimary() {
  if (cluster.isPrimary) {
    const numCPUs = require('os').cpus().length;
    const links = await UrlsModel.getUrls(0, limit);

    for (let i = 0; i < numCPUs; i += 1) {
      worker = cluster.fork();
      start = step * i;
      end = start + step;

      worker.send(links.slice(start, end));

      worker.on('message', async (msg) => {
        const rejectedData = await knex
          .from('links')
          .whereIn('id', msg.data[0])
          .update({ status: 'passive' });

        console.log('Table update rejected', rejectedData);

        const fulfilledData = await knex
          .from('links')
          .whereIn('id', msg.data[1])
          .update({ status: 'active' });

        console.log('Table update fulfilled', fulfilledData);
      });

      worker.on('error', (error) => {
        console.log(error);
      });
    }

    cluster.on('exit', async (worker) => {
      console.log(`worker ${worker.process.pid} died.`);

      if (start >= limit) {
        return false;
      }

      worker = cluster.fork();
      start = end;
      end = start + step;
      let count = start + step - (step * numCPUs);
      console.log(count, ' => Has been checked!');

      if (count >= limit) {
        throw new Error('Good!! Your data has been checked!!');
      }

      worker.send(links.slice(start, end));

      worker.on('message', async (msg) => {
        const rejectedData = await knex
          .from('links')
          .whereIn('id', msg.data[0])
          .update({ status: 'passive' });

        console.log('Table update rejected', rejectedData);

        const fulfilledData = await knex
          .from('links')
          .whereIn('id', msg.data[1])
          .update({ status: 'active' });

        console.log('Table update fulfilled', fulfilledData);
      });

      worker.on('error', (error) => {
        console.log(error);
      });
    });
  } else {
    process.on('message', async (msg) => {
      process.send({ data: await UrlService.checkUrls(msg) });
      process.kill(process.pid);
    });
  }
}

isPrimary();
