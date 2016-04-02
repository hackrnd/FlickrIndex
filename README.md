# FlickrIndex

Visually index pictures from a Flickr group, and find them in real-time!

FlickrIndex is a simple pipeline combining Clarifai's image regognition / deep learning API and Algolia's search-as-a-service API to let you visually index Flickr pictures, and find them in real-time!

## Pre-requisite

- Create an Clarifai application at http://www.clarifai.com/api
- Create an Flickr application at https://www.flickr.com/services and get the API key
- Create an Algolia application and index at http://www.algolia.com/doc

## Tag and index data

The script to tag and index the pictures are located in ./scripts.

First, set-up virtualenv and install dependencies

    cd ./scripts
    virtualenv env
    source env/bin/activate
    pip install -r requirements.txt

Then, copy ./scripts/settings.py.dist into ./scripts/settings.py and update with your own values

    # Ignore pictures where the tagged concept has a probability below the threshold
    THRESHOLD = 0.9
    # Number of pictures to index
    MAX_MEDIA = 1000
    
    # Clarifai API details - http://www.clarifai.com/api
    CLARIFAI_APP_ID = 'xxx'
    CLARIFAI_APP_SECRET = 'xxx'
    
    # Algolia API details = http://www.algolia.com/doc
    ALGOLIA_APP_ID = 'xxx'
    ALGOLIA_APP_KEY = 'xxx'
    ALGOLIA_INDEX_NAME = 'xxx'
	
	# Flickr API details - https://www.flickr.com/services/api/
	FLICKR_API_KEY = 'xxx'
	FLICKR_GROUP_ID = 'xxx'

Finally, launch the index procees

    python ./index.py

## Setup Algolia index

Go to the "Raking" page of your Algolia index settings and:
- Add (in this order) "likes", "tags", and "title" in "Basic settings" > "Custom ranking"
- Move "Custom" before "Attribute" in "Ranking formula" > "Ranking"

Go to the "Display" page of your Algolia index settings and:
- Add "tags" in "Faceting" > "Attributes for faceting"
- Add "tags", "created", "thumbnail", "title", "url", "likes" in "Display & Pagination" > "Attributes to retrieve"

## Web UI

A basic interface build on top of Algolia's instant-search is available in ./ui.

Edit ./ui/js/app.js to set-up your own Algolia API and index values

