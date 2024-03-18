import {
  Client,
  initLogger,
} from "@iota/sdk";
import { topics } from './constants';
import { blockMapper, getMilestonePayload } from './helpers';
import { Recorder, Parsed, RecorderBlock } from "./types";
import fs from 'fs';

require('dotenv').config({ path: '.env' });

const TIME_LIMIT = 10000; // 10 seconds in milliseconds

async function writeToFile(dataObject: any, filePath: string): Promise<void> {
  try {
    // Convert the dataObject to a JSON string
    const jsonString = JSON.stringify(dataObject, null, 2);

    // Write the JSON string to the file
    await fs.promises.writeFile(filePath, jsonString);

    console.log('Data has been written to', filePath);
  } catch (error) {
    console.error('Error writing to file:', error);
    throw error; // Rethrow the error for handling at the caller's level
  }
}

const limitReached = (startTime: number, currentTime: number) => {
  return currentTime - startTime >= TIME_LIMIT;
};

async function run() {
  initLogger();
  if (!process.env.NETWORK_API) {
      throw new Error('.env NETWORK_API is undefined, see .env.example');
  }

  // Connecting to a MQTT broker using raw ip doesn't work with TCP. This is a limitation of rustls.
  const client = new Client({
      // Insert your node URL in the .env.
      nodes: [process.env.NETWORK_API],
  });

  // Array of topics to subscribe to
  // Topics can be found here https://studio.asyncapi.com/?url=https://raw.githubusercontent.com/iotaledger/tips/main/tips/TIP-0028/event-api.yml

  const startTime = new Date().getTime();
  const recorded: Recorder = {
    start: new Date().getTime(),
    protocol: process.env.PROTOCOL || '',
    network: process.env.NETWORK_NAME || '',
    end: null,
    blocks: [],
  };
  const recordedBlocks: RecorderBlock[] = [];

  const callback = async function (error: Error, data: string) {
      if (error != null) {
          console.log(error);
          return;
      }

      const parsed: Parsed = JSON.parse(data);

      if (parsed.topic == 'milestone') {
        const milestonePayload = getMilestonePayload(parsed);
      } else if (parsed.topic == 'blocks') {
          const currentTime = new Date().getTime();
          const mappedBlock = blockMapper(parsed, currentTime);

          if (mappedBlock) {
            recordedBlocks.push(mappedBlock);
          }


          if (limitReached(startTime, currentTime)) {
            recorded.end = currentTime;
            recorded.blocks = recordedBlocks;
            await client.clearMqttListeners(topics);
            await writeToFile(recorded, 'recordedFeed.json');
            // minify and record
            // await writeToFile(JSON.stringify(recorded, null, 0), 'recordedMinifiedFeed.json');
            process.exit(0);
          }
      }
  };

  await client.listenMqtt(topics, callback);
}

run();
