// The NEO catalog's worker: fetch, validate and build the swarm attributes off the main thread, then hand the
// buffers over without copying them. The DOM lib types `self` as a Window; its `postMessage(message, { transfer })`
// matches the worker's own signature.
import { type NeoCatalogRequest, loadNeoCatalogMessage } from './neoCatalogMessage';

self.onmessage = (event: MessageEvent<NeoCatalogRequest>) => {
  void loadNeoCatalogMessage(event.data).then(({ message, transfer }) => {
    self.postMessage(message, { transfer });
  });
};
