# 福岡市API

To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000
```
http://localhost:3000/docs
```
data 
```
https://data.bodik.jp/dataset/
```

adding api process,
1. first create db schema
2. write script to import csv data to database
3. write api endpoint for corresponding database.
4. write swaggger for api endpoint.

/api/index.js is output from build vercel