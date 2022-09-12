const SPS = 256;
const SECONDS = 4;
const channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2', 'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4'];
const REF_CHANNELS = ['F3', 'F4', 'FC5', 'FC6', 'F7', 'F8', 'T7', 'T8', 'AF3', 'AF4'];
const OCC_CHANNELS = ['O2', 'O1'];
const SYMBOL_MAP = { 'B': 0, 'F': 1, 'S': 2, 'D': 3, 'U': 4, 'C': 5, 'X': 6 }

module.exports = { channels, SPS, REF_CHANNELS, OCC_CHANNELS, SYMBOL_MAP, SECONDS };