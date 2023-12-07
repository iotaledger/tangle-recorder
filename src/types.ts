import {    
  Block
} from "@iota/sdk";

export type RecorderBlock = {
  id: string;
  timestamp: number;
  block?: Block;
}

export type Recorder = {
  start: number;
  end: number;
  network: string;
  protocol: string;
  recordedBlocks: RecorderBlock[]; // info from network
}

export type Parsed = {
  topic: string;
  payload: string;
};