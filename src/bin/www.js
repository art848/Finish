// Standard modules
import 'dotenv/config';
import 'regenerator-runtime';

// Modules from this project
import cluster from 'cluster';
import UrlService from '../services/UrlService';
import { UrlsModel } from '../models';
import db from '../../knex.config';

const knex = require('knex')(db.option);

const numCPUs = require('os').cpus().length;

let start = 0;
let end = 0;
const step = 20;
let worker = [];
const limit = 320;

async function isPrimary() {
  if (cluster.isPrimary) {
    const links = await UrlsModel.getUrls(0, limit);
    for (let i = 0; i < numCPUs; i += 1) {
      worker.push(cluster.fork());
      start = step * i;
      end = start + step;

      worker[i].send(links.slice(start, end));

      worker[i].on('message', async (msg) => {
        console.log(msg);
        const informationalResponses = await knex
          .from('links')
          .whereIn('id', msg.data[0])
          .update({ status: 'informationalResponses' });

        console.log('Table updated', informationalResponses);

        const successfulResponses = await knex
          .from('links')
          .whereIn('id', msg.data[1])
          .update({ status: 'successfulResponses' });

        console.log('Table updated', successfulResponses);

        const redirectionMessages = await knex
          .from('links')
          .whereIn('id', msg.data[2])
          .update({ status: 'redirectionMessages' });

        console.log('Table updated', redirectionMessages);

        const clientErrorResponses = await knex
          .from('links')
          .whereIn('id', msg.data[3])
          .update({ status: 'clientErrorResponses' });

        console.log('Table updated', clientErrorResponses);
      });

      worker[i].on('error', (error) => {
        console.log(error);
      });
    }

    cluster.on('exit', async (currWorker) => {
      start = end;
      end = start + step;

      if (end <= limit) {
        worker = worker.filter((w) => w.id !== currWorker.id);

        worker.push(cluster.fork());

        const chunk = links.slice(start, end);
        console.log('INIT start, end => ', start, end);
        worker[numCPUs - 1].send(chunk);

        worker[numCPUs - 1].on('message', async (msg) => {
          const informationalResponses = await knex
            .from('links')
            .whereIn('id', msg.data[0])
            .update({ status: 'informationalResponses' });

          console.log('Table updated', informationalResponses);

          const successfulResponses = await knex
            .from('links')
            .whereIn('id', msg.data[1])
            .update({ status: 'successfulResponses' });

          console.log('Table updated', successfulResponses);

          const redirectionMessages = await knex
            .from('links')
            .whereIn('id', msg.data[2])
            .update({ status: 'redirectionMessages' });

          console.log('Table updated', redirectionMessages);

          const clientErrorResponses = await knex
            .from('links')
            .whereIn('id', msg.data[3])
            .update({ status: 'clientErrorResponses' });

          console.log('Table updated', clientErrorResponses);
        });

        worker[numCPUs - 1].on('error', (error) => {
          console.log(error);
        });
      }
    });
  } else {
    process.on('message', async (msg) => {
      process.send({ data: await UrlService.checkUrls(msg) });
      process.kill(process.pid);
    });
  }
}

isPrimary();

