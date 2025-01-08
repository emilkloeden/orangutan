# Orangutan

![Orangutan logo](assets/logo-cropped-small.webp)

_Orangutan_ is a minimal, dynamically-typed, interpreted language with a C-like
syntax. _Orangutan_ is a port of the [Monkey](https://monkeylang.org) language
designed by Thorsten Ball in his
[_Writing an Interpreter in Go_](https://interpreterbook.com/) to TypeScript and
is hosted on the Deno runtime.

## Why?

Great question! There isn't a lot of good reason to _use_ _Orangutan_ so much as
there is to participate in it's development.

_Orangutan_ is a toy language with no ecosystem as such it is the perfect base
to start building from.

## Language features

- Variable assignment

      let five = 5;

- Arrays

      let arr = [1,2,3];
      arr[0]; // 1

- Hashes

      let hash = { "language": "orangutan" };
      hash["language"]; // "orangutan"

- Function definition with optionally implicit return of final expression
  evaluation.

      let add = fn(a, b) {
          a + b;
      }

- First-class functions

      let twice = fn(f, x) {
        return f(f(x));
      }

## Differences from _Monkey_

_Orangutan_ deviates from the canonical implementation of _Monkey_ as follows:

### Changed Builtins

- The `push` function on an array is renamed to `append` as _Orangutan_ also
  supports a `prepend` function

### New Builtins

#### String manipulation

- `split(str, on)` splits a string `str` into an array of strings on instances
  of `on`
- `len(str)` returns the length of a string

#### Array manipulation

- `join(arr, using)` joins an array `arr` of strings using `using` between array items.
- `map(arr, fn)`
- `filter(arr, fn)`
- `reduce(arr, fn)`
- `zip(arrOne, arrTwo)` joins items from two arrays, joining on index, returning an array of two-item arrays as long as the shortest of `arrOne` and `arrTwo`
- `zipLongest(arrOne, arrTwo, optionalDefaultValue)` same as zip but returns an array the same length as the longer of `arrOne` and `arrTwo` with holes filled with `null` or `optionalDefaultValue` if supplied.

#### Hash manipulation

- `entries(hash)` returns an array of two-item arrays each representing the key, and value of each entry in `hash`.
- `keys(hash)` returns an array comprised of each key in `hash`.
- `values(hash)` returns an array comprised of each value in `hash`.
- `map(arr, fn)`
- `filter(arr, fn)`
- `reduce(arr, fn)`

#### Text file operations

- `readFile(path)` reads the content of a file into a String
- `writeFile(path, str)` writes `str` to a file at `path`

#### HTTP operations

- `get(url)` returns the body of an HTTP GET request to `url` as a String
- `post(url, str)` posts `str` as the body of an HTTP POST request to `url`.

#### General operations

- `type(obj)` returns the type of `obj`
- `prompt()` prompts user for input
- `ffi(javascriptString)` is an experimental feature that passes
  `javascriptString` down to the Deno runtime to evaluate.

### Other differences

- A `Number` type, distinct from the basic `Monkey` type (which ultimately resolves to a javascript `Number` type)
- Variable reassignment across scopes
- The `use(filePath)` function for importing code from other files
- Hashes can be used as indices to Hashes (this was added as a requirement to realise [Orangutan Monkey Interpreter](https://github.com/emilkloeden/orangutan-monkey-interpreter))

## Installation

- First ensure Deno is installed. Last tested on
  `deno 2.0.6  (stable, release, x86_64-pc-windows-msvc)`
- Then just clone the repository:
  `git clone https://github.com/emilkloeden/orangutan.git`
- (Optionally) compile the binary with:
  `deno compile -A -o <destination_path> .\src\index.ts`

## Usage

### REPL

```bash
$ deno run --allow-all=. .\index.ts
Orangutan REPL. Press Ctrl+c or type exit() to quit.
>
```

(or if `orangutan` is compiled and added to your PATH variable)

```bash
$ orangutan
```

### Execute scripts

```bash
$ deno run --allow-all=. .\index.ts run <my_script.utan>
```

(or if `orangutan` is compiled and added to your PATH variable)

```bash
$ orangutan run
```

## Project stretch goals

- A language server
- A package manager
