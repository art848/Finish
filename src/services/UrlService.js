import fetch from 'node-fetch';

class UrlService {
  static async checkUrls(urls) {
    const informationalResponses = [];
    const successfulResponses = [];
    const redirectionMessages = [];
    const clientErrorResponses = [];

    const items = urls.map((ur) => (`https://${ur.domain}`));
    const ids = urls.map((id) => id.id);
    await Promise.allSettled(items.map((url) => fetch(url)))
      .then((res) => {
        for (let index = 0; index < res.length; index += 1) {
          if (res[index].status === 'fulfilled') {
            if (res[index].value.status >= 100 && res[index].value.status < 200) {
              informationalResponses.push(ids[index]);
            } else if (res[index].value.status >= 200 && res[index].value.status < 300) {
              successfulResponses.push(ids[index]);
            } else if (res[index].value.status >= 300 && res[index].value.status < 400) {
              redirectionMessages.push(ids[index]);
            } else if (res[index].value.status >= 400 && res[index].value.status < 500) {
              clientErrorResponses.push(ids[index]);
            }
          } else if (res[index].status === 'rejected') {
            clientErrorResponses.push(ids[index]);
          }
        }
      });
    // console.log('informationalResponses =>', informationalResponses);
    // console.log('successfulResponses =>', successfulResponses);
    // console.log('redirectionMessages =>', redirectionMessages);
    // console.log('clientErrorResponses =>', clientErrorResponses);

    return [informationalResponses, successfulResponses, redirectionMessages, clientErrorResponses];
  }
}

export default UrlService;

