#!/usr/bin/perl -T

use strict;
use warnings;

use CGI;
use File::Basename;
use Image::Size 'html_imgsize';
use JSON;
use Template;

use constant {
	ROOT_DIR      => dirname(__FILE__), # for mod_perl
	IMAGE_DIR     => '../comics',
	VIEWER_PATH   => '/includes/comic',
	INFO_FILE     => 'info.json',
	TEMPLATE_FILE => 'templates/comic.tt'
};

sub process_request {
	my $q = CGI->new();
	$q->charset('utf-8');

	my $comic = $q->param('comic') || '';
	my $page = int ($q->param('page') || 0);
	my $path = join('/', ROOT_DIR, IMAGE_DIR, $comic);

	die "No such comic exists: $comic" unless (-f join('/', $path, INFO_FILE));

	local $/; # loads entire file into scalar

	open my $handle, '<', join('/', $path, INFO_FILE)
		or die "Could not get comic info: $comic";
	my $info = <$handle>;
	close $handle;

	my $info_ref = decode_json($info);
	my $title = $info_ref->{'title'};
	my $extension = $info_ref->{'extension'};

	my $img = get_image($page, $extension);

	print $q->header('text/html');
	my $template = Template->new(INCLUDE_PATH => ROOT_DIR);
	$template->process(TEMPLATE_FILE, {
		title       => $title,
		viewer_path => VIEWER_PATH,
		page        => $page == 0 ? 'Cover Page' : "Page $page",
		prev        => -f join('/', $path, get_image($page - 1, $extension)),
		prev_link   => get_page($page - 1),
		img         => $img,
		img_size    => html_imgsize(join('/', $path, $img)),
		next        => -f join('/', $path, get_image($page + 1, $extension)),
		next_link   => get_page($page + 1)
	}) or die $template->error;
}

process_request();

################################################################################
# file name subroutines                                                        #
################################################################################

sub get_image {
	my ($n, $ext) = @_;
	return $n == 0 ? "cover.$ext" : sprintf('page-%02d.%s', $n, $ext);
}

sub get_page {
	my ($n) = @_;
	return $n == 0? '.' : sprintf('page-%02d.html', $n);
}