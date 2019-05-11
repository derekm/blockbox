# Blockbox, authenticating Office documents with Bitcoin

The Blockbox Add-in creates a Lockbox for each document, allowing Office 365 apps to use Bitcoin SV to store and authenticate documents entirely on the blockchain.

## Setup for development & testing

* Install [nodejs.org](nodejs.org)
* Install [git-scm.org](git-scm.org)
* Open Command Prompt, run:
  * `git clone https://github.com/derekm/blockbox.git`
  * `cd blockbox`
  * `npm install`
  * `npm run start:web`
* Go to Office Online, open a Word doc and:
  * click Insert ribbon
    * click Add-ins
    * click Upload My Add-in
    * click Browse...
    * select the `manifest.xml` file in the blockbox folder
    * click Upload
  * click Home ribbon
    * click Show Taskpane
* Fund Lockbox
* Split txns
* Await confirmation
* Upload
* ???
* PROFIT!

## Known issues

Support for documents with only 1 file part was broken after the D:// protocol transaction was added to the upload process at the end of the hackathon.

Add-in works only for larger documents that require 2 or more file parts.

## Questions and comments

We'd love to get your feedback about this sample. You can send your feedback to us in the *Issues* section of this repository.

## Additional resources

* [Bcat document](https://bico.media/c6655e7f069ed7d342b0ff37fb9d4ea946405455896041e026a81ef622499ed3)
* [B:// document](https://bico.media/d759182e03eabc14aaa6e250f9469a105f7f2db8aeab6b0136b654b49f4e07a0)
* [PowerPoint presentation](https://bico.media/79f04fb9479594726b03b08fe46845c51684bf1e54df32710aa6441df7bb4c74)

## Copyright

Copyright (c) 2019 Derek P. Moore. All rights reserved.
