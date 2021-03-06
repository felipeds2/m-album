/* eslint no-undef: [0]*/
module.exports = {
  title: "mAlbum",
  style: "m-album.less",
  template: 'm-album.html',
  i18n: {
    pt: "lang/pt-BR.json",
    en: "lang/en-US.json"
  },
  link: function() {},
  controller: function(
    $scope,
    $rootScope,
    $filter,
    $timeout,
    $mState,
    $stateParams,
    $mDataLoader,
    $element,
    $ionicModal,
    $ionicScrollDelegate,
    $mDaia,
    $mAuth,
    $ionicPopover,
    $mAlert
  ) {
    var dadosIniciais = [];
    var dataLoadOptions;
    var userLikeId;
    var list = {
      /**
       * Set the view and update the needed parameters
       * @param  {object} data Data received from Moblets backend
       * @param  {boolean} more If called by "more" function, it will add the
       * data to the items array
       */
      setView: function(data, more) {
        if (isDefined(data)) {
          $scope.error = false;
          $scope.emptyData = false;
          var origData = JSON.stringify(data.items);

          if (data.search === true) {
            $rootScope.$broadcast('hideShowSearch', {data});
          }

          $scope.search = isDefined(data.search) ? data.search === true : false;

          // If it was called from the "more" function, concatenate the items
          $scope.items = (more) ? $scope.items.concat(data.items) : data.items;

          // Set "noContent" if the items lenght = 0
          $scope.moblet.noContent = $scope.items === undefined ||
            $scope.items.length === 0;

          // set empty itens if no content
          if ($scope.moblet.noContent) {
            $scope.items = [];
          }

          // Check if the page is loading the list or a detail
          $scope.isDetail = list.isDetail();

          // Disable the "more" function if the API don't have more items
          $scope.more = (data.hasMoreItems && !$scope.isDetail) ? list.more : undefined;
        } else {
          $scope.error = true;
          $scope.emptyData = true;
        }


        // Broadcast complete refresh and infinite scroll
        $rootScope.$broadcast('scroll.refreshComplete');
        $rootScope.$broadcast('scroll.infiniteScrollComplete');

        if (!$scope.isDetail) {
           $rootScope.$broadcast('show-search', {data});
         }
 
         $scope.$on("update-data", function(event, args) { 
 
           console.log(document.getElementById('input-search').style.color);
 
           if ($scope.items.length < dadosIniciais.length) {
             $scope.items = [];
 
             for (var i = 0; dadosIniciais[i] !== undefined; i++) {
               $scope.items.push(dadosIniciais[i]);
             }
           }
           
           var quant_destroy = $scope.items.length - args.response.results.length;
 
           //popula os itens encontrados
           for (var i = 0; i <= args.response.results.length -1; i++) {
               $scope.items[i].description = args.response.results[i].item.description;
               $scope.items[i].id = args.response.results[i].item.id;
               $scope.items[i].image = args.response.results[i].item.image;
               $scope.items[i].resume = args.response.results[i].item.resume;
               $scope.items[i].title = args.response.results[i].item.title;
           }
 
           //destroi os itens desnecessarios
           while(quant_destroy > 0) {
             $scope.items.splice(-1,1)  
             quant_destroy--;
           }
 
         });

        // If the view is showing the detail, call showDetail
        if ($scope.isDetail) {
          list.showDetail();
        }

        // Remove the loading animation
        $scope.moblet.isLoading = false;

        $scope.$on("check-update-data", function(event, args) { 
             if ($scope.items.length < dadosIniciais.length) {
               $scope.items = JSON.parse(origData);
             }
         });
      },
      /**
       * Check if the view is showing a detail or the list. The function checks
       * if $stateParams.detail is set.
       * @return {boolean} True if the view must show a detail.
       */
      isDetail: function() {
        return $stateParams.detail !== "";
      },
      /**
       * Show the detail getting the index from $stateParams.detail. Set "item"
       * to the selected detail
       */
      showDetail: function(detailIndex) {
        console.log($stateParams.detail);
        if(detailIndex !== undefined) {
          $stateParams.detail = $scope.items[detailIndex].id;
        }
        $scope.detail = {
          likesCount: 0,
          commentsCount: 0
        }
        $mDaia.get('m-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/likes')
        .then(function(response) {
          $scope.detail.likesCount = response.total;
        });

        $mDaia.get('m-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/comments')
        .then(function(response) {
          $scope.detail.commentsCount = response.total;
        });

        // If the user is logged
        $mAuth.user.isLogged(function(isLogged) {
          if (isLogged) {
            var url = 'm-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/likes/search';
            var query = {
              query: {
                match: {
                  user: $mAuth.user.get().user.id
                }
              }
            };
            $mDaia.post(url, query).then(function(response) {
              if (response.total === 0) {
                $scope.detail.userLikedPhoto = false;
              } else {
                $scope.detail.userLikedPhoto = true;
                userLikeId = response.results[0]._id;
              }
            });  
          }
        });
        if (isDefined($stateParams.detail) && $stateParams.detail !== "") {
          // $scope.imageH = calculatedImageHeight();
          var itemIndex = _.findIndex($scope.items, function(item) {
            return item.id.toString() === $stateParams.detail;
          });
          if (itemIndex === -1) {
            dataLoadOptions = {
              //offset: $scope.items === undefined ? 0 : $scope.items.length,
              items: 1000,
              cache: false
            };
            // Comentei o bloco abaixo para evitar um loop infinito de requisições
            // list.load(false, function() {
            //   list.showDetail();
            // });
          } else {
            $scope.detail = $scope.items[itemIndex];
            $scope.detail.index = itemIndex;
          }
        } else if (isDefined(detailIndex)) {
          $scope.detail = $scope.items[detailIndex];
          $scope.detail.index = detailIndex;
        }
      },
      /**
       * Load data from the Moblets backend:
       * - show the page loader if it's called by init (sets showLoader to true)
       * - Use $mDataLoader.load to get the moblet data from Moblets backend.
       * 	 The parameters passed to $mDataLoader.load are:
       * 	 - $scope.moblet - the moblet created in the init function
       * 	 - false - A boolean that sets if you want to load data from the
       * 	   device storage or from the Moblets API
       * 	 - dataLoadOptions - An object with parameters for pagination
       * @param  {boolean} showLoader Boolean to determine if the page loader
       * is active
       * @param {function} callback Callback
       */
      load: function(showLoader, callback) {
        if ($stateParams.detail === '') {
          $stateParams.pageTitle = null;
        }
        $scope.moblet.isLoading = showLoader || false;
        // Reset the pagination
        if (showLoader === true || showLoader === undefined) {
          dataLoadOptions.offset = 0;
        }
        // mDataLoader also saves the response in the local cache. It will be
        // used by the "showDetail" function
        $mDataLoader.load($scope.moblet, dataLoadOptions)
          .then(function(data) {
            list.setView(data);

            $rootScope.$broadcast('hide-search-refresh');

             dadosIniciais = JSON.stringify(data.items);
             dadosIniciais = JSON.parse(dadosIniciais);
 
             console.log(dadosIniciais, "dadosIniciais");
 
 

            if (typeof callback === 'function') {
              callback();
            }
          }
        );
      },
      /**
       * Load more data from the backend if there are more items.
       * - Update the offset summing the number of items
       - Use $mDataLoader.load to get the moblet data from Moblets backend.
       * 	 The parameters passed to $mDataLoader.load are:
       * 	 - $scope.moblet - the moblet created in the init function
       * 	 - false - A boolean that sets if you want to load data from the
       * 	   device storage or from the Moblets API
       * 	 - dataLoadOptions - An object with parameters for pagination
       */
      more: function() {
        // Add the items to the offset
        
        dataLoadOptions.offset += dataLoadOptions.items;

        $mDataLoader.load($scope.moblet, dataLoadOptions)
          .then(function(data) {
            list.setView(data, true);
            $timeout(function() {}, 500);
          });

      },
      /**
       * Initiate the list moblet:
       * - put the list.load function in the $scope
       * - run list.load function
       */
      /*
       * TODO go to detail if url is called
       */
      init: function() {
        dataLoadOptions = {
          offset: 0,
          items: 1000,
          listKey: 'items',
          cache: false
        };
        $scope.load(true);
        $scope.reload = function(){
          if($stateParams.detail !== ""){
            $scope.load();
          } else {
            $rootScope.$broadcast('scroll.refreshComplete');
            $rootScope.$broadcast('scroll.infiniteScrollComplete');
          } 
        }
      }
    };

    var listItem = {

      next: function(detail) {
        if (detail.index !== -1 && detail.index < $scope.items.length - 1) {
          $scope.nextAnimation = true;
          $scope.nextDetail = $scope.items[detail.index + 1];
          $scope.nextDetail.index = detail.index + 1;
          $timeout(function() {
            //$stateParams.detail = $scope.items[$scope.detail.index].id;
            list.showDetail($scope.nextDetail.index);
            $scope.detail = $scope.nextDetail;
            $scope.nextAnimation = false;
          }, 500);
        }
      },
      prev: function(detail) {
        if (detail.index > 0) {
          $scope.prevAnimation = true;
          $scope.prevDetail = $scope.items[detail.index - 1];
          $scope.prevDetail.index = detail.index - 1;
          $timeout(function() {
            //$stateParams.detail = $scope.items[$scope.detail.index].id;
            console.log($stateParams.detail);
            list.showDetail($scope.prevDetail.index);
            $scope.detail = $scope.prevDetail;
            $scope.prevAnimation = false;
          }, 500);
        }
      },
      showPrev: function(detail) {
        if(isDefined(detail))
        {
          return detail.index > 0;
        } else {
          return false
        }
      },
      showNext: function(detail) {
         if(isDefined(detail))
        {
           return detail.index !== -1 && detail.index < $scope.items.length - 1;
        } else {
          return false
        }
       
      },
      getDetailImage: function(detail) {
        if(isDefined(detail)){
          return {
            "background-image": "url('" + detail.image + "')"
          };
        }
      },
      goTo: function(detail) {
        $stateParams.pageTitle = detail.title;
        $stateParams.detail = detail.id;
        $mState.go('u-moblets', 'page', {
          detail: detail.id
        });
      },
      likeOrUnlike: function() {
        if ($scope.doingRequest) return;
        $scope.doingRequest = true;
        
        $mAuth.user.isLogged(function(isLogged) {
          if (isLogged) {
            if ($scope.detail.userLikedPhoto) {
              var url = 'm-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/likes/' + userLikeId;
              $mDaia.remove(url)
              .then(function() {
                setTimeout(function() {
                  $scope.doingRequest = false;
                }, 1000);
                $scope.detail.userLikedPhoto = false;
                $scope.detail.likesCount -= 1;
              }).catch(function() {
                setTimeout(function() {
                  $scope.doingRequest = false;
                }, 1000);
              });
            } else {
              var url = 'm-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/likes';
              $mDaia.post(url, {
                body: {
                  user: true,
                  date: true
                }
              }).then(function() {
                setTimeout(function() {
                  $scope.doingRequest = false;
                }, 1000);
                $scope.detail.userLikedPhoto = true;
                if ($scope.detail.likesCount === undefined) {
                  $scope.detail.likesCount = 0;
                }
                $scope.detail.likesCount += 1;
              }).catch(function() {
                setTimeout(function() {
                  $scope.doingRequest = false;
                }, 1000);
              });
            }
          } else {
            $scope.commentsModal.hide();
            $mAuth.login();
          }
        });
      }
    };

    var modal = {
      created: function() {
        $ionicModal.fromTemplateUrl('malbum-zoom-modal.html', {
          scope: $scope,
          hardwareBackButtonClose:true,
          animation: 'scale-in'
        }).then(function(modal) {
          $scope.modal = modal;
          $scope.modal.hide();
        });
        
        $scope.openModal = function() {
          $scope.modal.show();
        };
        
        $scope.closeModal = function() {
          $scope.modal.hide();
          $timeout(function(){
            $ionicScrollDelegate.$getByHandle('m-album-zoom-scroll').zoomTo(1);
          }, 500);
        };
        
        $scope.destroyModal = function() {
          $scope.modal.remove();
        }; 
      }
    }

    var commentsModal = {
      created: function() {
        $ionicModal.fromTemplateUrl('malbum-comments-modal.html', {
          scope: $scope,
          hardwareBackButtonClose:true,
          animation: 'scale-in'
        }).then(function(modal) {
          $scope.commentsModal = modal;
          $scope.commentsModal.hide();
        });
        
        $scope.openCommentsModal = function() {
          $scope.malbumUserComment = "";
          $scope.commentsModal.show();
          $mDaia.get('m-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/comments', {
            profile: true
          }).then(function(res) {
            $scope.comments = res.results;
          });
        };
        
        $scope.closeCommentsModal = function() {
          $scope.commentsModal.hide();
        };
        
        $scope.destroyCommentsModal = function() {
          $scope.commentsModal.remove();
        };

        $scope.sendMessage = function() {
          if ($scope.doingRequest) return;
          $scope.doingRequest = true;

          $mAuth.user.isLogged(function(isLogged) {
            if (isLogged) {
              var comment = document.getElementById('albumCommentsInput').value;
              if (comment != '') {
                $mDaia.post('m-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/comments', {
                  body: {
                    user: true,
                    date: true,
                    comment: comment
                  }
                }).then(function(res) {
                  setTimeout(function() {
                    $scope.doingRequest = false;
                  }, 1000);
                  $mDaia.get('m-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/comments', {
                    profile: true
                  }).then(function(res) {
                    $scope.comments = res.results;
                  });
                  document.getElementById('albumCommentsInput').value = "";
                }).catch(function() {
                  setTimeout(function() {
                    $scope.doingRequest = false;
                  }, 1000);
                });
              }
            } else {
              $scope.commentsModal.hide();
              $mAuth.login();
            }
          });
        };

        $scope.openPopover = function($event , item){
          $scope.item = item;
          var template = fs.readFileSync(path.join(__dirname,
            'm-album-report.html'), 'utf8');
          $scope.popover = $ionicPopover.fromTemplate(template, {
            scope: $scope
          });
          $scope.popover.show($event);
        };


        $scope.report = function() {
          if ($scope.doingRequest) return;
          $scope.doingRequest = true;

          $scope.popover.hide();
          $mAlert.dialog($filter('translate')("report_title"),
            $filter('translate')("report_confirm"),
            [$filter('translate')("cancel_button"),
            $filter('translate')("report_button")])
            .then(function(success) {
              if (success) {
                var url = 'm-album/' + $stateParams.pageId + '/' + $stateParams.detail + '/reports';
                $mDaia.post(url, {
                  body: {
                    user: true,
                    date: true,
                    commentId: $scope.item._id
                  }
                }).then(function() { 
                  setTimeout(function() {
                    $scope.doingRequest = false;
                  }, 1000);
                }).catch(function() {
                  setTimeout(function() {
                    $scope.doingRequest = false;
                  }, 1000);
                });
              }
            });
        };
      }
    }
    
    $scope.stripHtml = function(str) {
      return str.replace(/<[^>]+>/ig, " ");
    };

    function calculatedImageHeight() {
      console.log($element);
      
      var top = parseInt(window.getComputedStyle(document.querySelector(".pane[nav-view='active'] ion-content.scroll-content"))["top"]);
      var bottom = parseInt(window.getComputedStyle(document.querySelector(".pane[nav-view='active'] ion-content.scroll-content"))["bottom"]);
      var currentHeight = document.documentElement.clientHeight;
      var frame = currentHeight - top - bottom
      
      var descount = 5 * (100 / document.documentElement.clientWidth) + 90;
      return frame - descount + "px"
    }

    window.malbumImageLoaded = function(element) {
      element.parentElement.classList.add("loaded");
    }

    $scope.load = list.load;
    $scope.init = list.init;
    $scope.nextDetail = {};
    $scope.prevDetail = {};
    $scope.goTo = listItem.goTo;
    $scope.getDetailImage = listItem.getDetailImage;
    $scope.next = listItem.next;
    $scope.prev = listItem.prev;
    $scope.showNext = listItem.showNext;
    $scope.showPrev = listItem.showPrev;
    $scope.likeOrUnlike = listItem.likeOrUnlike;
    modal.created();
    commentsModal.created();

    $scope.$on('$stateChangeStart', $scope.destroyModal);
    $scope.$on('$destroy', $scope.destroyModal);
    
    list.init();
  }
};
