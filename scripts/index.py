from flickrindex import FlickrIndex

from settings import FLICKR_API_KEY, FLICKR_GROUP_ID
from settings import CLARIFAI_APP_ID, CLARIFAI_APP_SECRET
from settings import ALGOLIA_APP_ID, ALGOLIA_APP_KEY, ALGOLIA_INDEX_NAME
from settings import THRESHOLD, MAX_MEDIA

if __name__ == "__main__" :
    index = FlickrIndex(
        FLICKR_API_KEY, FLICKR_GROUP_ID,
        CLARIFAI_APP_ID, CLARIFAI_APP_SECRET,
        ALGOLIA_APP_ID, ALGOLIA_APP_KEY, ALGOLIA_INDEX_NAME,
        THRESHOLD, MAX_MEDIA
    )
    index.run()