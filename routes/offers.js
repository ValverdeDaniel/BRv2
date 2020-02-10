const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Proposal = mongoose.model('proposals');
const Offer = mongoose.model('offers');

const user = mongoose.model('users');
const { ensureAuthenticated, ensureGuest } = require('../helpers/auth');
const { ensureLoggedIn } = require('connect-ensure-login');
const axios = require('axios');
const request = require('request-promise');
const { getMetadata } = require('page-metadata-parser');
const domino = require('domino');


// this is where the Offer routes begin
//add Offer Buyer creates offer
router.get('/addOffer', ensureAuthenticated, (req, res) => {
  Offer.find({ user: req.user.id }, { tag: true })
    .then(o => {
      console.log(o);
      let tags = [];
      if (o.length > 0) {
        o.forEach(offer => {
          if (offer.tag.length > 0) {
            offer.tag.forEach(item => {
              tags.push(item.text.toLowerCase());
            })
          }
        })
      }
      let result = [];
      let map = new Map();
      for (let item of tags) {
        if (!map.has(item)) {
          map.set(item, true);    // set any value to Map
          result.push(item.toLowerCase());
        }
      }
      let t = [];
      let count = 0;
      for (var i = result.length; i >= 0; i--) {
        t.push(result[i]);
        if (count > 10) {
          break;
        }
        count++;
      }
      res.render('offers/addOffer', {
        tags: t
      });
    })
})


//process add offer submit
router.post('/addOffer/new', ensureAuthenticated, (req, res) => {
  (async () => {

  // let allowComments;
  // if (req.body.allowComments) {
  //   allowComments = true;
  // } else {
  //   allowComments = false;
  // }
  let approvalNeeded;
  if (req.body.approvalNeeded) {
    approvalNeeded = true;
  } else {
    approvalNeeded = false;
  }
  let credit;
  if (req.body.credit) {
    credit = true;
  } else {
    credit = false;
  }
  let offerLink = req.body.offerLink;
  let n = offerLink.indexOf('?');
  offerLink = offerLink.substring(0, n != -1 ? n : offerLink.length);

  let newOffer = {
    offerLink: offerLink,
    compensation: req.body.compensation,
    usage: req.body.usage,
    credit: credit,
    approvalNeeded: approvalNeeded,
    welcomeMessage: req.body.welcomeMessage,
    redemptionInstructions: req.body.redemptionInstructions,
    offerType: "Offer",
    //approvalNeeded: approvalNeeded
    //status: req.body.status,
    //allowComments: allowComments,
    user: req.user.id
    //igUsername: igUsername
  }

  let tagIDs = [];
  if (req.body.tags.length > 0) {
    let tagsArr = req.body.tags.split(',');
    tagsArr.forEach(item => {
      tagIDs.push({ text: item.toLowerCase() });
    });

    newOffer.tag = tagIDs;
  }

  // console.log(newProposal);
  // return;

  //create proposal
  new Offer(newOffer)
    .save()
    .then(offer => {
      res.redirect(`/offers/createSubmission/${offer.id}`);
    })

  })()
})



//edit proposal form
router.get('/editOffer/:id', ensureAuthenticated, (req, res) => {
  Offer.find({ user: req.user.id }, { tag: true })
    .then(p => {
      console.log(p);
      let tags = [];
      if (p.length > 0) {
        p.forEach(offer => {
          if (offer.tag.length > 0) {
            offer.tag.forEach(item => {
              tags.push(item.text.toLowerCase());
            })
          }
        })
      }
      let result = [];
      let map = new Map();
      for (let item of tags) {
        if (!map.has(item)) {
          map.set(item, true);    // set any value to Map
          result.push(item.toLowerCase());
        }
      }
      let t = [];
      let count = 0;
      for (var i = result.length; i >= 0; i--) {
        t.push(result[i]);
        if (count > 10) {
          break;
        }
        count++;
      }

      Offer.findOne({
        _id: req.params.id
      })
        .then(offer => {
          let tag = "";
          if (offer.tag.length > 0) {
            offer.tag.forEach(item => {
              // console.log(item.text);
              tag = tag + item.text.toLowerCase() + ',';
            })
            tag = tag.slice(0, -1);
          }
          if (offer.user != req.user.id) {
            res.redirect('/offers/my')
          } else {
            res.render('offers/editOffer', {
              offer: offer,
              tag: tag,
              tags: t
            });
          }
        });
    })

});

//edit form process
router.put('/editOffer/:id', (req, res) => {
  Offer.findOne({
    _id: req.params.id
  })
    .then(offer => {
      let approvalNeeded;
      if (req.body.approvalNeeded) {
        approvalNeeded = true;
      } else {
        approvalNeeded = false;
      }
      let credit;
      if (req.body.credit) {
        credit = true;
      } else {
        credit = false;
      }

      var offerLink = req.body.offerLink;
      var n = offerLink.indexOf('?');
      offerLink = offerLink.substring(0, n != -1 ? n : offerLink.length);

      //new values
      offer.offerLink= offerLink;
      offer.compensation= req.body.compensation;
      offer.usage= req.body.usage;
      offer.credit= credit;
      offer.approvalNeeded= approvalNeeded;
      offer.welcomeMessage= req.body.welcomeMessage;
      offer.redemptionInstructions= req.body.redemptionInstructions;
      offer.offerType= "Offer";
      //approvalNeeded= approvalNeeded
      //status= req.body.status;
      //allowComments= allowComments;
      //igUsername= igUsername

      // if (req.body.contractUserType == "Seller") {
      //   offer.sellerStripeAccountId = req.user.stripeAccountId
      // }

      let tagIDs = [];
      if (req.body.tags.length > 0) {
        let tagsArr = req.body.tags.split(',');
        tagsArr.forEach(item => {
          tagIDs.push({ text: item });
        });

        offer.tag = tagIDs;
      }
      console.log('offereditOffer: ' + offer)
      console.log('made it to editOffer right before save')
      offer.save()
        .then(offer => {
          res.redirect(`/offers/createSubmission/${offer.id}`);
        });
    });
});


//edit exchange form customer
router.get('/createSubmission/:id', (req, res) => {

      let tag
      Offer.findOne({
        _id: req.params.id
      })
        .then(offer => {
          console.log('/createSubmission route we made it !')
          // if (offer.user != req.user.id) {
          //   res.redirect('/offers/my')
          // } else {
          Offer.findOne({
            _id: req.params.id
          })
            .then(offer => {
              let tag = "";
              if (offer.tag.length > 0) {
                offer.tag.forEach(item => {
                  // console.log(item.text);
                  tag = tag + item.text.toLowerCase() + ',';
                })
                tag = tag.slice(0, -1);
              }

            });
            console.log('approvalneeded1')
            console.log('offer' + offer)
            try{

              if (offer.approvalNeeded == true) {
                var status = 'Waiting for Approval'
                console.log('approvalNeeded')
              } else {
                var status = 'Approved'
                console.log('Approved')
              }
              req.session.offer = offer;
              req.session.status = status
              var approvalNeeded = offer.approvalNeeded
              req.session.approvalNeeded = approvalNeeded
              console.log('1' + status)
              console.log('1' + approvalNeeded)
              // console.log('2' + approvalStatus)



            res.render('offers/createSubmission', {
              offer: offer,
              tag: tag,
              status: status,
              approvalNeeded: approvalNeeded
              
            });
          } catch {
            console.log('something went wrong section of /createSubmission')
          }
        });

});

//edit exchange form customer
router.get('/createSubmissionGClient/:id', ensureLoggedIn('/auth/google'), (req, res) => {
  let tag
  Offer.findOne({
    _id: req.params.id
  })
    .then(offer => {
      console.log('/createSubmission route we made it !')
      // if (offer.user != req.user.id) {
      //   res.redirect('/offers/my')
      // } else {
      Offer.findOne({
        _id: req.params.id
      })
        .then(offer => {
          let tag = "";
          if (offer.tag.length > 0) {
            offer.tag.forEach(item => {
              // console.log(item.text);
              tag = tag + item.text.toLowerCase() + ',';
            })
            tag = tag.slice(0, -1);
          }

        });
        console.log('approvalneeded1')
        console.log('offer' + offer)
        try{

          if (offer.approvalNeeded == true) {
            var status = 'Waiting for Approval'
            console.log('approvalNeeded')
          } else {
            var status = 'Approved'
            console.log('Approved')
          }
          req.session.offer = offer;
          req.session.status = status
          var approvalNeeded = offer.approvalNeeded
          req.session.approvalNeeded = approvalNeeded
          console.log('1' + status)
          console.log('1' + approvalNeeded)
          // console.log('2' + approvalStatus)



        res.render('offers/createSubmission', {
          offer: offer,
          tag: tag,
          status: status,
          approvalNeeded: approvalNeeded
          
        });
      } catch {
        console.log('something went wrong section of /createSubmission')
      }
    });

});

//edit exchange form customer
router.get('/createSubmissionFBClient/:id', ensureLoggedIn('/auth/facebook'), (req, res) => {
  let tag
  Offer.findOne({
    _id: req.params.id
  })
    .then(offer => {
      console.log('/createSubmission route we made it !')
      // if (offer.user != req.user.id) {
      //   res.redirect('/offers/my')
      // } else {
      Offer.findOne({
        _id: req.params.id
      })
        .then(offer => {
          let tag = "";
          if (offer.tag.length > 0) {
            offer.tag.forEach(item => {
              // console.log(item.text);
              tag = tag + item.text.toLowerCase() + ',';
            })
            tag = tag.slice(0, -1);
          }

        });
        console.log('approvalneeded1')
        console.log('offer' + offer)
        try{

          if (offer.approvalNeeded == true) {
            var status = 'Waiting for Approval'
            console.log('approvalNeeded')
          } else {
            var status = 'Approved'
            console.log('Approved')
          }
          req.session.offer = offer;
          req.session.status = status
          var approvalNeeded = offer.approvalNeeded
          req.session.approvalNeeded = approvalNeeded
          console.log('1' + status)
          console.log('1' + approvalNeeded)
          // console.log('2' + approvalStatus)



        res.render('offers/createSubmission', {
          offer: offer,
          tag: tag,
          status: status,
          approvalNeeded: approvalNeeded
          
        });
      } catch {
        console.log('something went wrong section of /createSubmission')
      }
    });

});

//process add exchange attempt2 proposal customer
router.post('/createSubmission/new', (req, res) => {
  //console.log('exchange1')
  (async ()=> {
    let credit;
    if (req.body.credit) {
      credit = true;
    } else {
      credit = false;
    }
    console.log('exchange2')

    let url = req.body.url;
    let n = url.indexOf('?');
    url = url.substring(0, n != -1 ? n : url.length);
  
    // / Create the base function to be ran /
    let igUsername;  
    console.log('exchange3')

    try {
        let html = await request(url);
        const doc = domino.createWindow(html).document;
        const metadata = getMetadata(doc, url);
        if (metadata != null && metadata.description != null) {
          igUsername=metadata.description.match(/\(([^)]+)\)/)[1];
          console.log('metadata is', metadata.description.match(/\(([^)]+)\)/)[1]);
          console.log(igUsername);
        } else {
          console.log('either metadata is undefined or it does not contains the description name')
        }
        debugger;
    } catch {
         console.log('something went wrong with the scraper probably that multiphoto for private user scenario')
    }
    var status = req.session.status
    var approvalNeeded = req.session.approvalNeeded
    console.log('status' + status)
    console.log('exchange4' + approvalNeeded)

    let newProposal = {
      url: url,
      compensation: req.body.compensation,
      usage: req.body.usage,
      credit: credit,
      user: req.user.id,
      igUsername: igUsername,
      ogOwner: req.body.ogOwner,
      ogProposalId: req.body.ogProposalId,
      redemptionInstructions: req.body.redemptionInstructions,
      status: status,
      approvalNeeded: approvalNeeded,
      proposalType: "Submission"
    }
    console.log('exchange5')

    new Proposal(newProposal)
      .save()
      .then(proposal => {
        console.log('exchange6')

        res.redirect(`/proposals/showSubmission/${proposal.id}`);
      })
  

  })()
})

//show singleSubmission proposal
router.get('/showSubmission/:id', async (req, res) => {

  let tag
  Proposal.findOne({
    _id: req.params.id
  })
    .then(proposal => {
      console.log('/createSubmission route we made it !')
      // if (proposal.user != req.user.id) {
      //   res.redirect('/proposals/my')
      // } else {
      Proposal.findOne({
        _id: req.params.id
      })
        .then(proposal => {
          let tag = "";
          if (proposal.tag.length > 0) {
            proposal.tag.forEach(item => {
              // console.log(item.text);
              tag = tag + item.text.toLowerCase() + ',';
            })
            tag = tag.slice(0, -1);
          }

        });
        res.render('proposals/showSubmission', {
          proposal: proposal,
          tag: tag
        });
      // }
    });

});

//logged in Users proposals
router.get('/mySubmissions', ensureAuthenticated, (req, res) => {
  Proposal.find({ user: req.user.id }, { tag: true })
    .then(p => {
      console.log(p);
      let tags = [];
      if (p.length > 0) {
        p.forEach(proposal => {
          if (proposal.tag.length > 0) {
            proposal.tag.forEach(item => {
              tags.push(item.text.toLowerCase());
            })
          }
        })
      }

      console.log(tags);

      let result = [];
      let map = new Map();
      for (let item of tags) {
        if (!map.has(item)) {
          map.set(item, true);    // set any value to Map
          result.push(item.toLowerCase());
        }
      }
      console.log(result);

      if (tags.length > 0) {
        Proposal.find({$or: [{ user: req.user.id}, {ogOwner: req.user.id}], proposalType: "Submission" })
          .populate('user')
          .sort({ date: -1 })
          .then(proposals => {
            res.render('proposals/mySubmissions', {
              proposals: proposals,
              tags: result
            });
          });
      } else {
        Proposal.find({$or: [{ user: req.user.id}, {ogOwner: req.user.id}], proposalType: "Submission" })
          .populate('user')
          .sort({ date: -1 })
          .then(proposals => {
            res.render('proposals/mySubmissions', {
              proposals: proposals,
              tags: []
            });
          });
      }
    })
});

//logged in Users proposals
router.get('/myOffers', ensureAuthenticated, (req, res) => {
  Proposal.find({ user: req.user.id }, { tag: true })
    .then(p => {
      console.log(p);
      let tags = [];
      if (p.length > 0) {
        p.forEach(proposal => {
          if (proposal.tag.length > 0) {
            proposal.tag.forEach(item => {
              tags.push(item.text.toLowerCase());
            })
          }
        })
      }

      console.log(tags);

      let result = [];
      let map = new Map();
      for (let item of tags) {
        if (!map.has(item)) {
          map.set(item, true);    // set any value to Map
          result.push(item.toLowerCase());
        }
      }
      console.log(result);

      if (tags.length > 0) {
        Proposal.find({ user: req.user.id, proposalType: "Offer"})
          .populate('user')
          .sort({ date: -1 })
          .then(proposals => {
            res.render('proposals/myOffers', {
              proposals: proposals,
              tags: result
            });
          });
      } else {
        Proposal.find({ user: req.user.id, proposalType: "Offer"})
          .populate('user')
          .sort({ date: -1 })
          .then(proposals => {
            res.render('proposals/myOffers', {
              proposals: proposals,
              tags: []
            });
          });
      }
    })
});

//add redeem submission button route
router.post('/redeemSubmission/:id', (req, res) => {
  Proposal.findOne({
    _id: req.params.id
  })
    .then(proposal => {
      // const newVote = {
      //   voteBody: req.body.voteBody,
      //   voteUser: req.user.id
      // }
      // const newTouch = {
      //   touchedByUser: req.user.id
      // }
      console.log('In voteUSER');
      //console.log('Seller Stripe Account ID', req.user.stripeAccountId)
     


      proposal.status = "Redeemed";
      // voteBody= req.body.voteBody,
      // voteUser= req.user.id,
      // touchedBy= req.user.id
      // console.log('voteBody1: '+voteBody)
      // console.log('voteUser1: '+voteUser)
      // console.log('touchedByUser1: '+touchedBy)
      //push to votes array
      //unshift adds it to the beginning
      // proposal.votes.unshift(newVote);
      // proposal.touchedBy.unshift(newTouch);

      proposal.save()
        .then(proposal => {
          res.redirect(`/proposals/showSubmission/${proposal.id}`);
        })
    });
});

//add redeem submission button route
router.post('/approveSubmission/:id', (req, res) => {
  Proposal.findOne({
    _id: req.params.id
  })
    .then(proposal => {
      // const newVote = {
      //   voteBody: req.body.voteBody,
      //   voteUser: req.user.id
      // }
      // const newTouch = {
      //   touchedByUser: req.user.id
      // }
      console.log('In voteUSER');
      //console.log('Seller Stripe Account ID', req.user.stripeAccountId)
     


      proposal.status = "Approved";
      // voteBody= req.body.voteBody,
      // voteUser= req.user.id,
      // touchedBy= req.user.id
      // console.log('voteBody1: '+voteBody)
      // console.log('voteUser1: '+voteUser)
      // console.log('touchedByUser1: '+touchedBy)
      //push to votes array
      //unshift adds it to the beginning
      // proposal.votes.unshift(newVote);
      // proposal.touchedBy.unshift(newTouch);

      proposal.save()
        .then(proposal => {
          res.redirect(`/proposals/showSubmission/${proposal.id}`);
        })
    });
});


//add comment
router.post('/commentSubmission/:id', (req, res) => {
  Proposal.findOne({
    _id: req.params.id
  })
    .then(proposal => {
      const newComment = {
        commentBody: req.body.commentBody,
        commentUser: req.user.id,
        //touchedBy: req.user.id
      }
      const newTouch = {
        //touchedByUser: req.user.id
      }

      //push to comments array
      //unshift adds it to the beginning
      proposal.comments.unshift(newComment);
      //proposal.touchedBy.unshift(newTouch);

      proposal.save()
        .then(proposal => {
          res.redirect(`/proposals/showSubmission/${proposal.id}`);
        })
    });
});


router.post('/tags', ensureAuthenticated, (req, res) => {
  Proposal.find({ user: req.user.id }, { tag: true })
    .then(p => {
      let tags = [];
      if (p.length > 0) {
        p.forEach(proposal => {
          if (proposal.tag.length > 0) {
            proposal.tag.forEach(item => {
              tags.push(item.text.toLowerCase());
            })
          }
        })
      }
      let result = [];
      let map = new Map();
      for (let item of tags) {
        if (!map.has(item)) {
          map.set(item, true);    // set any value to Map
          result.push(item.toLowerCase());
        }
      }
      var PATTERN = new RegExp(req.body.keyword, 'i');
      console.log(PATTERN);
      var filtered = result.filter(function (str) { return PATTERN.test(str); });
      res.json((req.body.keyword == "" || req.body.keyword == null) ? [] : filtered);
    })
});

//display terms per proposal
router.get('/terms/:id', (req, res) => {
  Proposal.findOne({
    _id: req.params.id
  })
    .populate('user')
    .populate('votes.voteUser')
    .populate('comments.commentUser')
    .then(proposal => {
      res.render('proposals/terms', {
        proposal: proposal
      });
    })
});

module.exports = router;

