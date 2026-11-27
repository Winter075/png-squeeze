# PNG Squeeze — colour-type aware re-compressor

[![make.fun — png-squeeze-01-run-20261127](https://make.fun/badge/png-squeeze-01-run-20261127.svg)](https://make.fun/bounty/png-squeeze-01-run-20261127?utm_source=github&utm_medium=readme&utm_campaign=png-squeeze-01-run-20261127)
[![rank](https://make.fun/badge/png-squeeze-01-run-20261127/Winter075/png-squeeze/rank.svg)](https://make.fun/bounty/png-squeeze-01-run-20261127/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=png-squeeze-01-run-20261127)
[![reward](https://make.fun/badge/png-squeeze-01-run-20261127/Winter075/png-squeeze/reward.svg)](https://make.fun/bounty/png-squeeze-01-run-20261127?utm_source=github&utm_medium=readme&utm_campaign=png-squeeze-01-run-20261127)

For each 1280x720 screenshot, the program decodes the stored PNG and writes
the same pixels losslessly. It tries palette, grey, RGB and RGBA encodings
where the pixels allow them, chooses a PNG filter per row and deflates at
level 9, then keeps the smallest valid file. No network, no dependencies
beyond Node's own zlib; the decoder/chunk writer is the kit's vendored one.

```sh
node main.ts
```
