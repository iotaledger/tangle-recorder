import {
  Block
} from "@iota/sdk";

export type RecorderBlock = {
  id: string;
  timestampRec: number;
  block?: Block;
}

export type Recorder = {
  start: number;
  end: number | null;
  network: string;
  protocol: string;
  blocks: RecorderBlock[]; // info from network
}

export type Parsed = {
  topic: string;
  payload: string;
};
