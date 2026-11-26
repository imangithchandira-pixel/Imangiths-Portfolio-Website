/*
  All site content lives here.

  To add a project:
    1. Put its images in public/assets/img/ (.webp).
    2. Add an entry to PROJECTS with a unique `slug` (it becomes /projects/<slug>).
       - `cover`  : image shown on the Projects page. An optional `tile` replaces it
                    there when the grid cell suits a differently shaped image.
       - `rows`   : image rows on the project page. Each image sits on a 12-column
                    grid: `cols: [startColumn, columnSpan]`. The string 'meta' marks
                    where the "About the piece" facts go.
       - `nodes`  : the pieces that float on the home-page map. `x`/`y` are the
                    centre of the image in map units (the map is 6000 x 4200) and
                    `size` is its width in map units.
       - `route`  : how this project's pieces are joined across the park on the home
                    page: 'boardwalk', 'stones', 'sand', 'stream' or 'gravel'.
    Image entries are [fileNameWithoutExtension, pixelWidth, pixelHeight].

  The site is built from this file ahead of time, so a typo here fails the build
  instead of breaking a page in someone's browser.
*/

export type Img = readonly [name: string, width: number, height: number];
export type RouteType = 'boardwalk' | 'stones' | 'sand' | 'stream' | 'gravel';

export interface Figure {
  img: Img;
  cols: readonly [start: number, span: number];
  caption?: string;
}

export interface MapNode {
  img: Img;
  x: number;
  y: number;
  size: number;
}

export interface Project {
  slug: string;
  title: string;
  route: RouteType;
  description: string;
  meta: readonly (readonly [label: string, value: string])[];
  cover: Img;
  tile?: Img;
  rows: readonly (readonly Figure[] | 'meta')[];
  nodes: readonly MapNode[];
}

export const SITE = {
  name: 'Chandira Imanjith',
  url: 'https://imangiths-portfolio-website.vercel.app',
  description:
    'Sketches and studies by Chandira Imanjith, a first-year architecture student at the City School of Architecture, Colombo.',
  email: 'imangithchandira@gmail.com',
  // Web3Forms access key (web3forms.com). It is public by design: it can only
  // send notes to the inbox above. Empty means the contact form falls back to
  // opening the visitor's own email app.
  formKey: '5a71475e-42ca-448b-a688-51d704f249b9',
  linkedin: 'https://www.linkedin.com/in/chandira-imanjith-b4b7283a2',
  imgPath: '/assets/img/',
  imgExt: '.webp'
} as const;

export const MAP = { width: 6000, height: 4200, nodeScale: 1.28 } as const;

export const PROJECTS: readonly Project[] = [
  {
    slug: 'tower-sketches',
    title: 'Tower Sketches',
    route: 'boardwalk',
    description:
      'Perspective view of a slender glass residential tower with copper-accented balconies rising above a sculptural, perforated white base. A grand angular copper entrance canopy opens into a faceted glass lobby, while low podium wings with terraces and planting connect the building to its street corner.',
    meta: [
      ['Type', 'Perspective sketch'],
      ['Subject', 'Residential tower'],
      ['Medium', 'Ink and color on paper'],
      ['Drawn by', 'Chandira Imanjith']
    ],
    cover: ['tower-2', 1482, 1985],
    rows: [
      [
        { img: ['tower-2', 1482, 1985], cols: [1, 6], caption: 'The tower from its street corner' },
        { img: ['tower-1', 1170, 1734], cols: [7, 6], caption: 'A second study of the same view' }
      ],
      'meta',
      [
        { img: ['tower-1-canopy', 509, 509], cols: [1, 4], caption: 'The angular copper canopy opening into a faceted glass lobby' },
        { img: ['tower-1-base', 445, 445], cols: [5, 4], caption: 'Sculptural, perforated white base' },
        { img: ['tower-1-glass', 461, 461], cols: [9, 4], caption: 'Glass tower with copper-accented balconies' }
      ],
      [
        { img: ['tower-2-canopy', 578, 578], cols: [9, 4], caption: 'The entrance, in watercolor' }
      ]
    ],
    nodes: [
      { img: ['tower-1-md', 607, 900], x: 2540, y: 2700, size: 470 },
      { img: ['tower-2-md', 672, 900], x: 4500, y: 610, size: 480 },
      { img: ['tower-1-canopy', 509, 509], x: 1560, y: 1700, size: 420 },
      { img: ['tower-1-base', 445, 445], x: 4480, y: 3700, size: 400 },
      { img: ['tower-1-glass', 461, 461], x: 560, y: 600, size: 380 },
      { img: ['tower-2-canopy', 578, 578], x: 5400, y: 1560, size: 440 }
    ]
  },
  {
    slug: 'black-white-ink',
    title: 'Black & White Ink',
    route: 'stones',
    description:
      'A black-and-white ink study of light and dark: an interior perspective where dense hatching, cross-hatching and solid black masses contrast with a bright, open corridor at the far end. Faceted volumes and a sweeping staircase guide the eye through the space, and the sharp shifts between shadow and light create depth, drama and rhythm.',
    meta: [
      ['Type', 'Interior perspective'],
      ['Subject', 'Light and dark'],
      ['Medium', 'Ink on paper'],
      ['Drawn by', 'Chandira Imanjith']
    ],
    cover: ['ink', 1170, 993],
    rows: [
      [
        { img: ['ink', 1170, 993], cols: [1, 8] },
        { img: ['ink-passage', 414, 583], cols: [9, 4], caption: 'The bright, open corridor at the far end' }
      ],
      'meta',
      [
        { img: ['ink-stairs', 376, 376], cols: [1, 3], caption: 'The sweeping staircase' },
        { img: ['ink-volumes', 310, 310], cols: [4, 3], caption: 'Faceted volumes in hatching and cross-hatching' },
        { img: ['ink-corridor', 292, 292], cols: [7, 3], caption: 'Light held between solid black masses' }
      ]
    ],
    nodes: [
      { img: ['ink-md', 900, 764], x: 2620, y: 1560, size: 560 },
      { img: ['ink-corridor', 292, 292], x: 3440, y: 650, size: 320 },
      { img: ['ink-stairs', 376, 376], x: 4460, y: 2740, size: 380 },
      { img: ['ink-volumes', 310, 310], x: 1400, y: 3690, size: 330 }
    ]
  },
  {
    slug: 'malaga',
    title: 'Málaga',
    route: 'sand',
    description:
      'A watercolor and ink sketch of a Málaga street scene, where the cathedral’s domed bell tower rises between sunlit yellow facades. A tall palm and overhead wires frame the view, and market umbrellas and a sketched crowd animate the foreground.',
    meta: [
      ['Type', 'Street sketch'],
      ['Place', 'Málaga, Spain'],
      ['Medium', 'Watercolor and ink'],
      ['Drawn by', 'Chandira Imanjith']
    ],
    cover: ['malaga', 1250, 1725],
    tile: ['malaga-street', 1192, 831],
    rows: [
      [
        { img: ['malaga', 1250, 1725], cols: [1, 6] },
        { img: ['malaga-street', 1192, 831], cols: [7, 6], caption: 'Market umbrellas and a sketched crowd animate the foreground' }
      ],
      'meta',
      [
        { img: ['malaga-dome', 408, 408], cols: [1, 4], caption: 'The cathedral’s domed bell tower' },
        { img: ['malaga-arches', 424, 424], cols: [5, 4], caption: 'A tall palm against a sunlit facade' },
        { img: ['malaga-facade', 439, 439], cols: [9, 4], caption: 'Yellow facades under overhead wires' }
      ],
      [
        { img: ['malaga-umbrellas', 470, 470], cols: [9, 4], caption: 'Under the umbrellas' }
      ]
    ],
    nodes: [
      { img: ['malaga-md', 652, 900], x: 1500, y: 640, size: 470 },
      { img: ['malaga-dome', 408, 408], x: 640, y: 2760, size: 380 },
      { img: ['malaga-umbrellas', 470, 470], x: 3560, y: 1640, size: 420 },
      { img: ['malaga-facade', 439, 439], x: 5440, y: 500, size: 400 },
      { img: ['malaga-arches', 424, 424], x: 2440, y: 3720, size: 380 }
    ]
  },
  {
    slug: 'marseille',
    title: 'Marseille',
    route: 'stream',
    description:
      'A colorful watercolor and ink view down a narrow Marseille stairway lined with yellow and lavender buildings, potted plants and shuttered windows. The street opens onto the blue harbor, with a hillside of terracotta rooftops and a hilltop basilica beyond. A cat and a pair of strolling figures add life to the scene.',
    meta: [
      ['Type', 'Street sketch'],
      ['Place', 'Marseille, France'],
      ['Medium', 'Watercolor and ink'],
      ['Drawn by', 'Chandira Imanjith']
    ],
    cover: ['marseille', 1300, 1740],
    rows: [
      [
        { img: ['marseille', 1300, 1740], cols: [1, 6] },
        { img: ['marseille-hillside', 759, 854], cols: [7, 6], caption: 'Terracotta rooftops climbing to the hilltop basilica' }
      ],
      'meta',
      [
        { img: ['marseille-harbor', 396, 396], cols: [1, 4], caption: 'The street opens onto the blue harbor' },
        { img: ['marseille-cat', 364, 364], cols: [5, 4], caption: 'A cat on the stairway' },
        { img: ['marseille-figures', 348, 348], cols: [9, 4], caption: 'A pair of strolling figures' }
      ],
      [
        { img: ['marseille-plants', 412, 412], cols: [1, 4], caption: 'Potted plants and shuttered windows' },
        { img: ['marseille-basilica', 412, 412], cols: [9, 4], caption: 'The basilica on its hill' }
      ]
    ],
    nodes: [
      { img: ['marseille-md', 672, 900], x: 520, y: 1680, size: 480 },
      { img: ['marseille-basilica', 412, 412], x: 2560, y: 470, size: 390 },
      { img: ['marseille-harbor', 396, 396], x: 4480, y: 1720, size: 400 },
      { img: ['marseille-cat', 364, 364], x: 3540, y: 2740, size: 350 },
      { img: ['marseille-plants', 412, 412], x: 1500, y: 2700, size: 380 },
      { img: ['marseille-figures', 348, 348], x: 5420, y: 2640, size: 340 }
    ]
  },
  {
    slug: 'colombo-town-hall',
    title: 'Colombo Town Hall',
    route: 'gravel',
    description:
      'Colombo Town Hall: a neoclassical landmark with a central dome, pedimented columned portico, and symmetrical two-storey wings.',
    meta: [
      ['Type', 'Building sketch'],
      ['Place', 'Colombo, Sri Lanka'],
      ['Medium', 'Ink on paper'],
      ['Drawn by', 'Chandira Imanjith']
    ],
    cover: ['townhall', 1320, 660],
    rows: [
      [
        { img: ['townhall', 1320, 660], cols: [1, 12] }
      ],
      'meta',
      [
        { img: ['townhall-dome', 264, 264], cols: [1, 3], caption: 'The central dome' },
        { img: ['townhall-portico', 352, 352], cols: [4, 4], caption: 'The pedimented, columned portico' },
        { img: ['townhall-wing', 330, 330], cols: [9, 4], caption: 'One of the symmetrical two-storey wings' }
      ]
    ],
    nodes: [
      { img: ['townhall-md', 900, 450], x: 3460, y: 3740, size: 620 },
      { img: ['townhall-dome', 264, 264], x: 5440, y: 3690, size: 330 },
      { img: ['townhall-portico', 352, 352], x: 560, y: 3700, size: 370 }
    ]
  }
];
