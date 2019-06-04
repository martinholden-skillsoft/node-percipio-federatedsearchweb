const getErrorBlock = error => ({
  color: 'danger',
  text: `*Error*:\n${error.message}`,
  mrkdwn_in: ['text']
});

const getDividerBlock = () => ({
  type: 'divider'
});

const getSuccessBlock = (markdown, imageUrl, altText) => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: markdown
  },
  accessory: {
    type: 'image',
    image_url: imageUrl,
    alt_text: altText
  }
});

module.exports = {
  getErrorBlock,
  getDividerBlock,
  getSuccessBlock
};
