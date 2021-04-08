# comic-viewer

The comic viewers used by the [*Love and War*](https://loveandwartherpg.com/) web site. There are two versions, a server-side "old" version written in Perl and a client-side "new" version written in JavaScript.

![Comic Viewer](screenshot.png)

## Guide

### Comics

Each comic is organized in a directory with a short name identifying the comic. Both versions of the viewer use comics in the same format. An example directory structure:

```
comics
	meaculpa
		info.json
		page-00.png
		page-01.png
		...
		page-84.png
		page-85.png
		thumb-00.png
		thumb-01.png
		...
		thumb-84.png
		thumb-85.png
```

Pages are named like "page-##.png" and can be any size. Page numbering starts with "00" (for the cover page).

Thumbnails are named like "thumb-##.png" and should be 150 pixels tall for standard DPI or 300 pixels tall for high DPI. Only the JavaScript version uses thumbnail images.

Each directory contains an "info.json" file containing metadata about the comic. An example "info.json" file:

```javascript
{
	"title":     "Mea Culpa",
	"extension": "png",
	"length":    85,
	"sections":  [1, 16, 29, 51, 65]
}
```

The file contains the following keys:

| Key | Description |
| - | - |
| `title` | Title of the comic |
| `extension` | File extension for images (including thumbnails) |
| `length` | The number of pages in the comic (only used by JavaScript version, required) |
| `sections` | The first page of each section of the comic (only used by the JavaScript version, optional) |

### Viewers

#### Old

This version is written for Perl 5 and meant for use in a CGI or mod\_perl environment. It requires the following non-core modules to be installed:

- [CGI](https://metacpan.org/pod/CGI)
- [Image::Size](https://metacpan.org/pod/Image::Size)
- [JSON](https://metacpan.org/pod/JSON)
- [Template::Toolkit](https://metacpan.org/pod/Template::Toolkit)

Set the `IMAGE_DIR` constant in the "comic.pl" file to point to the directory containing the comics and `VIEWER_PATH` to the location of the viewer.

The script takes the query string parameters `comic` (for the name of the comic directory) and `page` (for the page number). It is meant to be used with a mod\_rewrite rule like the following to rewrite prettier URLs such as `comics/meaculpa/page-01.html`:

```
RewriteRule ^comics/(\w+)/(page-(\d+).s?html)?$ includes/comic/comic.pl?comic=$1&page=$3 [L]
```

This version is no longer used.

#### New

This version is written in JavaScript as a single-page web application.

Set the `IMAGE_DIR` constant in the "comic.js" file to point to the directory containing the comics.

There are two ways to use the script:

The first way is to use a query string parameter `id` (for the name of the comic directory). The URL fragment is used for the page number. If using this method, remove the `base` tag from "index.html" as it is unnecessary. An example URL is `index.html?id=meaculpa#2` for page 2 of the comic "meaculpa."

The second way is to omit the query string, in which case the script takes the last segment of the virtual path. You can pair this with a mod\_rewrite rule like the following to rewrite prettier URLs such as `comics/meaculpa/`:

```
RewriteRule ^comics/(\w+)/?$ includes/comic/index.html [L]
```

You also have to change the `base href` attribute in "index.html" to point to the location of the viewer for this to work. This method also uses the URL fragment for the page number.

To see it in use, visit the [Comics](https://loveandwartherpg.com/comics.html) section of the *Love and War* web site.

## Authors

- J.C. Fields <jcfields@jcfields.dev>

## License

- [ISC license](https://opensource.org/licenses/ISC)
