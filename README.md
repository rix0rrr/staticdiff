# StaticDiff

Compare sets of files using only static file hosting: diffing happens in the browser.

## What is it?

Ever have the need to diff some sets of files (for example, inspect a diff on
some set of files that are generated during a GitHub build) ? And don't want to
run server side software to do the diffing? 

This tool is for you! All you need is some static file hosting like GitHub Pages
or S3, drop some files on there, and generate a hyperlink to tell the diff viewer
where to look.

### When not to use 

A downside of this method is that the time taken is going to be proportional to
the size of the files; if there are large files with few differences, this
method of local diffing isn't going to perform as well as a server-side solution.

Also, this isn't going to perform well over a poor internet connection.

## How to use

To use, you need to do three things:

- Drop the diff viewer on some static file hosting
- Prepare a fileset and upload it to the same static file hosting
- Generate a hyperlink pointing to two filesets

### Drop the diff viewer on some static file hosting

Download one of the StaticDiff releases, and put it somewhere on static file hosting.
Technically, the diff viewer could live on a different host, but then you would need 
to fiddle with CORS, and who has time to learn how that works?

For the purposes of this walkthrough, we'll assume you dropped it on 
`http://example.com/diff/`.

### Prepare a file set

The diff viewer needs a `MANIFEST` file indicating every file of the fileset, and
its content hash. It doesn't matter what the hash algorithm is, as long as its consistent
between filesets.

Here's a way to generate this manifest file (assuming you want to include all files 
into the diff):

```
directory/of/fileset$ shasum $(find . -type f) > MANIFEST
```

After generating the manifest file, upload the file set to a subdirectory of the static
file host. For example:

```
http://example.com/fileset1/

# Such that the following file exists:
http://example.com/fileset1/MANIFEST
```

### Generate a hyperlink

Once you have two file sets to compare, generate a hyperlink that passes the locations
of the two filesets to the diff viewer in the hash fragment. Pass the directory
names of the "left" and "right" filesets in the `l` and `r` parameters, like this:

```
http://example.com/diff/#l=/fileset1&r=/fileset2

# NOTE: do not include the name of the MANIFEST file in this URL.
```

That's it! When loading this URL, the diff viewer will load all the files from the file
sets and perform and render a diff in the browser.

## Configuration

The diff viewer accepts the following parameters, passed in the hash fragment
of the URL:

| Argument | Meaning | Default | 
| `l`, `r` | Directories of the left and right file sets | (required) |
| `lname`, `rname` | Symbolic names of the left and right file sets | Directory names |
| `manifest` | Name of the manifest file | `MANIFEST` |
| `selected` | URL encoded name of focused file | (used internally when clicking file tree) |




## Future work

Nice to have features that have not been implemented yet:

- Collapsing unchanged segments
- Line numbers
- Syntax highlighting
- Detecting and skipping binary files

Stretch goal:

- Some more advanced MANIFEST file format using content-defined file chunking so
  we can diff large files efficiently.