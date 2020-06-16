import { Observable } from 'rxjs'
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core'
import { AuthService, Notifier } from '@app/core'
import { User } from '@app/shared'
import { SessionStorageService } from '@app/shared/misc/storage.service'
import { UserService } from '@app/shared/users/user.service'
import { VideoPlaylist } from '@app/shared/video-playlist/video-playlist.model'
import { RecommendationInfo } from '@app/shared/video/recommendation-info.model'
import { MiniatureDisplayOptions } from '@app/shared/video/video-miniature.component'
import { Video } from '@app/shared/video/video.model'
import { RecommendedVideosStore } from '@app/videos/recommendations/recommended-videos.store'
import { I18n } from '@ngx-translate/i18n-polyfill'

@Component({
  selector: 'my-recommended-videos',
  templateUrl: './recommended-videos.component.html',
  styleUrls: [ './recommended-videos.component.scss' ]
})
export class RecommendedVideosComponent implements OnInit, OnChanges {
  @Input() inputRecommendation: RecommendationInfo
  @Input() playlist: VideoPlaylist
  @Output() gotRecommendations = new EventEmitter<Video[]>()

  autoPlayNextVideo: boolean
  autoPlayNextVideoTooltip: string

  displayOptions: MiniatureDisplayOptions = {
    date: true,
    views: true,
    by: true,
    avatar: true
  }

  userMiniature: User

  readonly hasVideos$: Observable<boolean>
  readonly videos$: Observable<Video[]>

  constructor (
    private userService: UserService,
    private authService: AuthService,
    private notifier: Notifier,
    private i18n: I18n,
    private store: RecommendedVideosStore,
    private sessionStorageService: SessionStorageService
  ) {
    this.videos$ = this.store.recommendations$
    this.hasVideos$ = this.store.hasRecommendations$
    this.videos$.subscribe(videos => this.gotRecommendations.emit(videos))

    if (this.authService.isLoggedIn()) {
      this.autoPlayNextVideo = this.authService.getUser().autoPlayNextVideo
    } else {
      this.autoPlayNextVideo = this.sessionStorageService.getItem(User.KEYS.SESSION_STORAGE_AUTO_PLAY_NEXT_VIDEO) === 'true' || false
      this.sessionStorageService.watch([User.KEYS.SESSION_STORAGE_AUTO_PLAY_NEXT_VIDEO]).subscribe(
        () => this.autoPlayNextVideo = this.sessionStorageService.getItem(User.KEYS.SESSION_STORAGE_AUTO_PLAY_NEXT_VIDEO) === 'true'
      )
    }

    this.autoPlayNextVideoTooltip = this.i18n('When active, the next video is automatically played after the current one.')
  }

  ngOnInit () {
    this.userService.getAnonymousOrLoggedUser()
      .subscribe(user => this.userMiniature = user)
  }

  ngOnChanges () {
    if (this.inputRecommendation) {
      this.store.requestNewRecommendations(this.inputRecommendation)
    }
  }

  onVideoRemoved () {
    this.store.requestNewRecommendations(this.inputRecommendation)
  }

  switchAutoPlayNextVideo () {
    this.sessionStorageService.setItem(User.KEYS.SESSION_STORAGE_AUTO_PLAY_NEXT_VIDEO, this.autoPlayNextVideo.toString())

    if (this.authService.isLoggedIn()) {
      const details = {
        autoPlayNextVideo: this.autoPlayNextVideo
      }

      this.userService.updateMyProfile(details).subscribe(
        () => {
          this.authService.refreshUserInformation()
        },
        err => this.notifier.error(err.message)
      )
    }
  }
}
