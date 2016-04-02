from datetime import datetime

from clarifai.client import ClarifaiApi
from algoliasearch import algoliasearch
import flickrapi

class FlickrIndex(object):
    """
    An indexer for Flickr pictures, using Clarifai for image recognition / tagging
    and Algolia for indexing and real-time search.
    
    Parameters
    ----------
    - flickr_api_key (string)
        Your Flickr api key
    - flickr_group_id (string)
        Flickr group/collection ID to pull images from
    - clarifai_app_id (string)
        Your Clarifai app ID
    - clarifai_app_secret (string)
        Your Clarifai app secret
    - algolia_app_id (string)
        Your Algolia app ID
    - algolia_app_key (string)
        Your Algolia app key
    - algolia_index_name (string)
        Your Algolia search index name
    - threshold (float)
        A threshold to exclude Clarifai tags if their probability is below it
    - max_media (int)
        The number of media to index

    """
    def __init__(self, 
            flickr_api_key, flickr_group_id,
            clarifai_app_id, clarifai_app_secret, 
            algolia_app_id, algolia_app_key, algolia_index_name,
            threshold=1,
            max_media=1000,
        ):
        
        self._clarifai = ClarifaiApi(clarifai_app_id, clarifai_app_secret)
        self._algolia = algoliasearch.Client(algolia_app_id, algolia_app_key).init_index(algolia_index_name)
        self._threshold = threshold
        self._max_media = max_media
        self._flickr = flickrapi.FlickrAPI(flickr_api_key, 'tezt')
        self._flickr_group_id = flickr_group_id
    
    def run(self):
        """
        Run the indexing process.
        
        Uses the Flickr API to pull images from a group.
        """
        recent_media = self._flickr.photos.search(page=1, per_page=120, group_id=self._flickr_group_id).find('photos').findall('photo')
        media = dict(['http://farm'+ medium.get('farm') +'.staticflickr.com/'+ medium.get('server') +'/'+ medium.get('id') +'_'+ medium.get('secret') +'_b.jpg', {
            'objectID' : medium.get('id'),
            'url' : 'http://farm'+ medium.get('farm') +'.staticflickr.com/'+ medium.get('server') +'/'+ medium.get('id') +'_'+ medium.get('secret') +'_b.jpg',
            'thumbnail' : 'http://farm'+ medium.get('farm') +'.staticflickr.com/'+ medium.get('server') +'/'+ medium.get('id') +'_'+ medium.get('secret') +'_t.jpg',
            'title' : medium.get('title'),
            'created' : datetime.strftime(datetime.now(), '%c'),
            'likes' : 0
        }] for medium in recent_media)
        self._tag_and_index(media)
            
            
    def _tag_and_index(self, media):
        """
        Tag media and index them in the search index.
        
        Call the Clarifai API only once with all image URLs.
        On response, filter to get only tags matching the default threshold or more.
        Then, send all tagged images to Algolia for indexing.
        
        Parameters
        ----------
        - media (list)
            A list of Flickr pictures, each of them being a dict of {
                'objectID' : the object ID
                'url' : the picture URL,
                'thumbnail' : the thumbnail URL,
                'title' : the picture title, if any,
                'created' : the picture creation date,
            }
        """
        urls = [medium['url'] for medium in media.values() if not medium['url'].endswith('mp4')]
        data = self._clarifai.tag_image_urls(urls)
        for result in data['results']:
            url, tags = result['url'], result['result']['tag']
            tags_dict = dict(zip(tags['classes'], tags['probs']))
            media[url]['tags'] = [tag[0] for tag in tags_dict.items() if tag[1] > self._threshold]
        self._algolia.save_objects(media.values())